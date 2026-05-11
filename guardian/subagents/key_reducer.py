"""
KeyReducerAgent - Continuous key normalization and balance checking

Watches all sources (screen text, logs, Found_Successfully.txt, etc.)
for key-like strings, normalizes them to all representations,
and checks balances across all chains.
"""

import re
import time
import threading
import queue
import traceback
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Iterator, Any
from .btc_recover import btc_from_hex, btc_from_wif
from pathlib import Path
from datetime import datetime, timezone
import requests

# Multi-chain support via bip_utils
from bip_utils import (
    Bip39SeedGenerator, Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins,
    Bip32KeyError, Bip32Utils, Bip32Secp256k1
)

# Multi-chain support via blockthon (if available)
try:
    import sys
    sys.path.insert(0, '/run/media/chucky/onn. Disk/v4.3.6')
    from blockthon.Utils import PrivateKey_To_Addr as btc_addr
    from blockthon.Ethereum import PrivateKey_To_ETH as eth_addr
    from blockthon.Litecoin import PrivateKey_To_LTC as ltc_addr
    from blockthon.Dogecoin import PrivateKey_To_DOGE as doge_addr
    from blockthon.Dash import PrivateKey_To_DASH as dash_addr
    from blockthon.DigiByte import PrivateKey_To_DGB as dgb_addr
    from blockthon.BitcoinGold import PrivateKey_To_BTG as btg_addr
    from blockthon.Qtum import PrivateKey_To_QTUM as qtum_addr
    from blockthon.Ravencoin import PrivateKey_To_RVN as rvn_addr
    from blockthon.Tron import PrivateKey_To_TRX as trx_addr
    from blockthon.zCash import PrivateKey_To_ZEC as zec_addr
    BLOCKTHON_AVAILABLE = True
except Exception:
    BLOCKTHON_AVAILABLE = False
    btc_addr = eth_addr = ltc_addr = doge_addr = None
    dash_addr = dgb_addr = btg_addr = qtum_addr = None
    rvn_addr = trx_addr = zec_addr = None

# Blockcypher / atomicwallet API balance checkers
BALANCE_APIS = {
    'btc': 'https://bitcoin.atomicwallet.io/api/v2/address/{addr}',
    'ltc': 'https://litecoin.atomicwallet.io/api/v2/address/{addr}',
    'doge': 'https://dogecoin.atomicwallet.io/api/v2/address/{addr}',
    'dash': 'https://dash.atomicwallet.io/api/v2/address/{addr}',
    'dgb': 'https://digibyte.atomicwallet.io/api/v1/address/{addr}',
    'btg': 'https://bgold.atomicwallet.io/api/v1/address/{addr}',
    'rvn': 'https://ravencoin.atomicwallet.io/api/v1/address/{addr}',
    'qtum': 'https://qtum.atomicwallet.io/api/v1/address/{addr}',
    'zec': 'https://zcash.atomicwallet.io/api/v1/address/{addr}',
}


@dataclass
class KeyFound:
    """Represents a normalized key with all its forms"""
    key_type: str  # hex, wif, mnemonic, xprv, etc.
    raw_value: str
    private_key_hex: Optional[str]
    addresses: Dict[str, str]  # coin -> address
    balances: Dict[str, float]  # coin -> balance
    total_usd: float
    source: str
    timestamp: datetime
    context: str = ""


class KeyReducerAgent:
    """
    Always-on agent that:
    1. Watches sources for key-like strings
    2. Normalizes to all representations
    3. Checks balances across all chains
    4. Emits events for found keys
    """
    
    # Regex patterns for key detection
    PATTERNS = {
        'hex64': re.compile(r'\b[0-9a-fA-F]{64}\b'),
        'wif': re.compile(r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
        'wif_testnet': re.compile(r'\b[9cC][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
        'xprv': re.compile(r'\b(?:xprv|tprv|yprv|zprv)[1-9A-HJ-NP-Za-km-z]{107,111}\b'),
        'mnemonic': re.compile(r'\b(?:[a-z]{3,10}\s+){11,23}[a-z]{3,10}\b'),
    }
    
    def __init__(
        self,
        balance_checkers: Dict[str, Callable],
        vault=None,
        assistant=None,
        min_balance_usd: float = 2000.0,
        watch_files: Optional[List[str]] = None,
    ):
        self.balance_checkers = balance_checkers
        self.vault = vault
        self.assistant = assistant
        self.min_balance_usd = min_balance_usd
        self.watch_files = watch_files or []
        
        self._running = False
        self._input_queue: queue.Queue = queue.Queue(maxsize=10000)
        self._output_queue: queue.Queue = queue.Queue(maxsize=1000)
        self._seen_values: set = set()
        self._threads: List[threading.Thread] = []
        
    def feed_text(self, text: str, source: str = "unknown", context: str = ""):
        """Feed text to be scanned for keys"""
        try:
            self._input_queue.put_nowait((text, source, context))
        except queue.Full:
            pass
    
    def _detect_keys(self, text: str) -> List[tuple]:
        """Detect all key-like strings in text"""
        found = []
        
        for key_type, pattern in self.PATTERNS.items():
            matches = pattern.findall(text)
            for match in matches:
                if match not in self._seen_values:
                    if key_type == 'mnemonic':
                        if len(match.split()) not in (12, 15, 18, 21, 24):
                            continue

                    self._seen_values.add(match)
                    found.append((key_type, match))
        
        if len(self._seen_values) > 100_000:
            self._seen_values.clear()
        
        return found
    
    def _normalize_key(self, key_type: str, value: str) -> Optional[dict]:
        """Normalize key to all representations"""
        try:
            if key_type == 'hex64':
                return self._from_hex(value)
            elif key_type in ('wif', 'wif_testnet'):
                return self._from_wif(value)
            elif key_type == 'xprv':
                return self._from_xprv(value)
            elif key_type == 'mnemonic':
                return self._from_mnemonic(value)
            else:
                return None
        except Exception:
            traceback.print_exc()
            return None
    
    def _from_hex(self, hex_key: str) -> Optional[dict]:
        """Convert hex private key to all forms across ALL chains"""
        try:
            priv_bytes = bytes.fromhex(hex_key)
            addresses = {}

            # ETH
            try:
                bip44_eth = Bip44.FromPrivateKey(priv_bytes, Bip44Coins.ETHEREUM)
                addresses['eth'] = bip44_eth.PublicKey().ToAddress()
            except Exception: pass

            # BTC
            try:
                btc = btc_from_hex(hex_key)
                if btc:
                    addresses['btc'] = btc['btc_p2wpkh']
                    addresses['btc_p2pkh'] = btc['btc_p2pkh']
                    addresses['btc_p2pkh_uncompressed'] = btc.get('btc_p2pkh_uncompressed')
                    addresses['btc_p2sh'] = btc['btc_p2sh_p2wpkh']
            except Exception: pass

            addresses = self._derive_all_chains(hex_key, base_addresses=addresses)

            return {
                'private_key_hex': hex_key.lower(),
                'addresses': addresses,
            }
        except Exception: return None

    def _from_wif(self, wif: str) -> Optional[dict]:
        """Convert WIF to all forms across ALL chains"""
        try:
            btc = btc_from_wif(wif)
            if not btc: return None
            hex_key = btc.get('private_key_hex')
            if not hex_key: return None
            return self._from_hex(hex_key)
        except Exception: return None

    def _derive_all_chains(self, hex_key: str, base_addresses: Dict = None) -> Dict:
        """Derive addresses for ALL supported chains from hex private key"""
        addresses = dict(base_addresses) if base_addresses else {}
        major_coins = [
            ('ltc', Bip44Coins.LITECOIN),
            ('doge', Bip44Coins.DOGECOIN),
            ('dash', Bip44Coins.DASH),
            ('bch', Bip44Coins.BITCOIN_CASH),
            ('etc', Bip44Coins.ETHEREUM_CLASSIC),
            ('tbtc', Bip44Coins.BITCOIN_TESTNET),
        ]
        priv_bytes = bytes.fromhex(hex_key)
        for name, coin in major_coins:
            if name not in addresses:
                try:
                    ctx = Bip44.FromPrivateKey(priv_bytes, coin)
                    addresses[name] = ctx.PublicKey().ToAddress()
                except: pass
        if not BLOCKTHON_AVAILABLE: return addresses
        chain_funcs = [
            ('dgb', dgb_addr), ('btg', btg_addr), ('qtum', qtum_addr),
            ('rvn', rvn_addr), ('trx', trx_addr), ('zec', zec_addr),
        ]
        for chain_id, func in chain_funcs:
            if chain_id in addresses or func is None: continue
            try:
                addr = func(hex_key)
                if addr: addresses[chain_id] = addr
            except Exception: pass
        return addresses
    
    def _from_xprv(self, xprv: str) -> Optional[dict]:
        """Convert xprv to all forms via BIP32 derivation"""
        try:
            bip32_ctx = Bip32Secp256k1.FromExtendedKey(xprv)
            priv_bytes = bip32_ctx.PrivateKey().Raw().ToBytes()
            return self._from_hex(priv_bytes.hex())
        except Exception: return None
    
    def _from_mnemonic(self, mnemonic: str) -> Optional[dict]:
        """Convert mnemonic to all forms"""
        try:
            seed = Bip39SeedGenerator(mnemonic).Generate()
            ctx = Bip44.FromSeed(seed, Bip44Coins.ETHEREUM).DeriveDefaultPath()
            privkey = ctx.PrivateKey().Raw().ToBytes()
            return self._from_hex(privkey.hex())
        except: return None
    
    def _check_balances(self, addresses: Dict[str, str]) -> Dict[str, float]:
        """Check balances for all addresses across ALL chains"""
        balances = {}
        for coin, address in addresses.items():
            balance_val = 0.0
            if coin in self.balance_checkers:
                try:
                    result = self.balance_checkers[coin](address)
                    balance_val = float(getattr(result, 'confirmed', result))
                except: pass
            if balance_val == 0.0 and coin in BALANCE_APIS:
                try:
                    url = BALANCE_APIS[coin].format(addr=address)
                    resp = requests.get(url, timeout=5)
                    balance_val = float(resp.json().get('balance', '0'))
                except: pass
            balances[coin] = balance_val
        return balances
    
    def _process_key(self, key_type: str, value: str, source: str, context: str):
        """Process a detected key - check ALL balances across ALL chains"""
        normalized = self._normalize_key(key_type, value)
        if not normalized: return
        addresses = normalized['addresses']
        if not addresses: return
        balances = self._check_balances(addresses)
        
        # Calculate total USD using live prices if available
        total_usd = 0.0
        prices = {}
        if self.assistant and hasattr(self.assistant, '_get_live_prices'):
            prices = self.assistant._get_live_prices()
        
        for coin, balance in balances.items():
            price = prices.get(coin.lower(), 0.0)
            if not price:
                # Fallbacks for BTC variations
                if 'btc' in coin.lower(): price = prices.get('btc', 0.0)
                # Hardcoded fallbacks if API is down
                if not price:
                    fallback_prices = {'btc': 65000.0, 'eth': 3500.0, 'ltc': 80.0, 'doge': 0.15, 'dash': 30.0, 'bch': 450.0}
                    price = fallback_prices.get(coin.lower(), 0.0)
                    if not price and 'btc' in coin.lower(): price = fallback_prices['btc']

            total_usd += balance * price

        non_zero = {c: b for c, b in balances.items() if b > 0}
        if non_zero or total_usd >= self.min_balance_usd:
            key_found = KeyFound(
                key_type=key_type, raw_value=value,
                private_key_hex=normalized.get('private_key_hex'),
                addresses=addresses, balances=balances,
                total_usd=total_usd, source=source,
                timestamp=datetime.now(timezone.utc), context=context,
            )
            if self.vault:
                self.vault.store_key(
                    key=normalized.get('private_key_hex'),
                    source=source,
                    metadata={
                        'key_type': key_type, 'addresses': addresses,
                        'balances': balances, 'total_usd': total_usd,
                    }
                )
            self._output_queue.put_nowait(key_found)
            if self.assistant:
                self.assistant.receive_event(
                    "key_reducer:found",
                    data={
                        'key_type': key_type, 'addresses': addresses,
                        'balances': balances, 'total_usd': total_usd,
                        'source': source,
                    }
                )
    
    def _worker(self, worker_id: int):
        """Worker that processes input queue"""
        while self._running:
            try:
                text, source, context = self._input_queue.get(timeout=1)
                detected = self._detect_keys(text)
                for key_type, value in detected:
                    self._process_key(key_type, value, source, context)
            except queue.Empty: continue
            except Exception: continue
    
    def _file_watcher(self):
        """Watch files for new keys"""
        file_positions = {}
        while self._running:
            for filepath in self.watch_files:
                try:
                    path = Path(filepath)
                    if not path.exists(): continue
                    current_size = path.stat().st_size
                    last_pos = file_positions.get(filepath, 0)
                    if current_size > last_pos:
                        with open(path, 'r') as f:
                            f.seek(last_pos)
                            new_text = f.read()
                        self.feed_text(new_text, source=f"file:{filepath}")
                        file_positions[filepath] = current_size
                except Exception: continue
            time.sleep(2)
    
    def start(self, num_workers: int = 4):
        """Start the key reducer"""
        if self._running: return
        self._running = True
        for i in range(num_workers):
            t = threading.Thread(target=self._worker, args=(i,), daemon=True)
            t.start()
            self._threads.append(t)
        if self.watch_files:
            t = threading.Thread(target=self._file_watcher, daemon=True)
            t.start()
            self._threads.append(t)
        print(f"[KeyReducer] Started with {num_workers} workers")
    
    def stop(self):
        """Stop the key reducer"""
        self._running = False
        for t in self._threads: t.join(timeout=2)
        self._threads.clear()
        print("[KeyReducer] Stopped")
    
    def found_keys(self) -> Iterator[KeyFound]:
        """Generator yielding found keys"""
        while self._running or not self._output_queue.empty():
            try:
                yield self._output_queue.get(timeout=1)
            except queue.Empty: continue
