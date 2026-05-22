import os
import time
import threading
import queue
import re
from pathlib import Path
from typing import List, Dict, Optional, Any, Iterator
from datetime import datetime, timezone
from dataclasses import dataclass
from .btc_recover import btc_from_hex, btc_from_wif, run_btcrecover_scan

@dataclass
class ScanHit:
    artifact_type: str
    path: str
    addresses: Dict[str, str]
    balances: Dict[str, float]
    metadata: Dict[str, Any]
    timestamp: datetime

class ComputerScannerAgent:
    """
    Non-destructive filesystem scanner for wallet artifacts.
    Integrates with richlists and balance checkers.
    """

    # Default High-Priority Target Addresses (Includes Recovery/Bridging Fee Addresses)
    DEFAULT_TARGETS = {
        'btc': [
            'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
            '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
            'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            '1PRQwKHJ4gsZ5Mou3xNkSMrHjBgNbD2E8A'
        ],
        'eth': [
            '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
            '0xdead00000000000000000000000000000000beef',
            '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
            '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
            '0x2d03B56989dE9E5c66CBcA7D3525Ad1B5178A7F1'
        ],
        'ltc': [
            'ltc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
            'LVuDpNCSSj6pQ7t9Pv6d6sUkLKoqDEVUnJ',
            'LRS1wTAbCH5HFb3DR1sXwoSsBMNdg9ULU5',
            'LZB5znAUsU35q1K3UfoGmcdwPdnneaQNqv'
        ],
        'doge': [
            'D8vFz1p5KqYqZ9x3hJmN7rT4wU2sV6bA8c',
            'DFpN6QqFfUm3gKNaxN6tNcab1FArL9cZLE',
            'DBMADVoQR2jWXnXeyTsoDYYhrGjepcWNgt',
            'DMpVUK7YGXfb3Esy6ujBrWEvDKDLeHNSih'
        ],
        'dash': ['XmN7PQYWKn5MJFna5fRYgP6mxT2F7xpekE', 'XgtuWVWf5L3p9iwe6mCTXK4toUb3aeWMxf'],
        'bch': ['bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cy4spdc2h', 'bitcoincash:qpzp3595m8q77rjnm7uezsm80c09yd2xyg0aj4mjqt'],
        'etc': ['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'],
    }

    WALLETS_MAP = {
        "wallet.dat": "Bitcoin Core",
        "electrum.dat": "Electrum",
        "keystore": "Ethereum Keystore",
        "default_wallet": "Electrum Wallet",
        "key.db": "Generic Wallet DB",
        "wallet.json": "Software Wallet JSON",
        "keys.json": "Key List JSON",
        "keys.txt": "Key List Text",
        "seeds.txt": "Seed List Text",
        "master.key": "Master Key File",
        "shard.key": "Key Shard",
        "wallet.aes.json": "Blockchain.info",
        "armory_*.wallet": "Armory",
        "multibit.wallet": "MultiBit Classic",
        "multibit-hd.wallet": "MultiBit HD",
        "key-backup.txt": "Bither",
        "bitcoin-wallet-backup-*": "Bitcoin Wallet (Android)",
        "mbhd.wallet.aes": "MultiBit HD",
        "ethereum_wallet.json": "Ethereum Wallet",
        "mSIGNA.wallet": "mSIGNA",
        "hive.wallet": "Hive",
    }

    COMMON_PATHS = [
        "~/.bitcoin", "~/.litecoin", "~/.dogecoin", "~/.dashcore",
        "~/.electrum/wallets", "~/.ethereum/keystore",
        "~/AppData/Roaming/Bitcoin", "~/AppData/Roaming/Litecoin",
        "~/AppData/Roaming/Dogecoin", "~/AppData/Roaming/DashCore",
        "~/AppData/Roaming/Electrum/wallets", "~/AppData/Roaming/Ethereum/keystore",
        "~/Library/Application Support/Bitcoin", "~/Library/Application Support/Litecoin",
        "~/Library/Application Support/DashCore", "~/Library/Application Support/Ethereum/keystore",
    ]

    def __init__(
        self,
        scan_paths: List[str] = None,
        balance_checkers: Dict = None,
        vault: Any = None,
        assistant: Any = None,
        min_balance_usd: float = 0.0,
        richlist_path: str = None,
        tokenlist_path: str = None,
        btc_recover_tokens: List[str] = None,
        btc_recover_max_tokens: int = 4,
        skip_balance_check: bool = False,
        deep_scan: bool = False
    ):
        self.scan_paths = scan_paths or self.COMMON_PATHS
        self.balance_checkers = balance_checkers or {}
        self.vault = vault
        self.assistant = assistant
        self.min_balance_usd = min_balance_usd
        self.richlist_path = richlist_path
        self.tokenlist_path = tokenlist_path
        self.btc_recover_tokens = btc_recover_tokens or []
        self.btc_recover_max_tokens = btc_recover_max_tokens
        self.skip_balance_check = skip_balance_check
        self.deep_scan = deep_scan

        self.is_running = False
        self.is_paused = False
        self._hit_queue = queue.Queue()
        self.stats = {
            "files_scanned": 0,
            "artifacts_found": 0,
            "keys_extracted": 0,
            "richlist_hits": 0,
            "recovery_attempts": 0,
            "recovery_matches": 0
        }

        self._scan_thread = None
        self._richlist = set()
        self._load_richlist()
        self._load_tokenlist()

        self.patterns = {
            'hex64': re.compile(r'\b[0-9a-fA-F]{64}\b'),
            'wif': re.compile(r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
            'wif_testnet': re.compile(r'\b[9cC][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
            'xprv': re.compile(r'\b(?:xprv|tprv|yprv|zprv)[1-9A-HJ-NP-Za-km-z]{107,111}\b'),
            'mnemonic': re.compile(r'\b(?:[a-z]{3,10}\s+){11,23}[a-z]{3,10}\b'),
            'shard': re.compile(r'\b(?:shard|part|share)_[0-9a-fA-F]{16,}\b', re.IGNORECASE),
            'address_eth': re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
            'address_btc': re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
            'address_bech32': re.compile(r'\bbc1[ac-hj-np-z02-9]{8,87}\b'),
            'address_ltc': re.compile(r'\b[LM][a-km-zA-HJ-NP-Z1-9]{26,33}\b'),
            'address_doge': re.compile(r'\bD[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}\b'),
        }

    def _load_richlist(self):
        for _chain, addrs in self.DEFAULT_TARGETS.items():
            for addr in addrs:
                self._richlist.add(addr)

        if self.richlist_path and os.path.exists(self.richlist_path):
            try:
                with open(self.richlist_path, 'r') as f:
                    for line in f:
                        addr = line.strip()
                        if addr: self._richlist.add(addr)
                print(f"[ComputerScanner] Loaded {len(self._richlist)} addresses from richlist")
            except Exception as e:
                print(f"[ComputerScanner] Failed to load richlist: {e}")

    def _load_tokenlist(self):
        if self.tokenlist_path and os.path.exists(self.tokenlist_path):
            try:
                with open(self.tokenlist_path, 'r') as f:
                    for line in f:
                        token = line.strip()
                        if token and token not in self.btc_recover_tokens:
                            self.btc_recover_tokens.append(token)
                print(f"[ComputerScanner] Loaded tokens from {self.tokenlist_path}")
            except Exception as e:
                print(f"[ComputerScanner] Failed to load tokenlist: {e}")

    def start(self, num_workers: int = 1):
        if self.is_running: return
        self.is_running = True
        self._scan_thread = threading.Thread(target=self._run_scan, daemon=True)
        self._scan_thread.start()

    def stop(self):
        self.is_running = False
        if self._scan_thread:
            self._scan_thread.join(timeout=1)

    def add_to_richlist(self, address: Any):
        """Add a single address or a list of addresses to the active richlist"""
        if isinstance(address, list):
            for a in address:
                if a: self._richlist.add(a)
            print(f"[ComputerScanner] Added {len(address)} addresses to active richlist. Total: {len(self._richlist)}")
        elif address:
            self._richlist.add(address)
            print(f"[ComputerScanner] Added {address} to active richlist. Total: {len(self._richlist)}")

    def _run_scan(self):
        print(f"[ComputerScanner] Starting scan. Deep scan: {self.deep_scan}")

        # 1. Targeted Recovery Search
        if self.deep_scan or self.btc_recover_tokens:
            print(f"[ComputerScanner] Initiating Deep Search with tokens: {self.btc_recover_tokens}")
            res = run_btcrecover_scan(
                tokenlist=self.btc_recover_tokens,
                target_addresses=list(self._richlist),
                exhaustive=self.deep_scan,
                workers=os.cpu_count() or 4
            )
            self.stats["recovery_attempts"] += res.get("attempts", 0)
            if res.get("found"):
                for match in res.get("matches", []):
                    self.stats["recovery_matches"] += 1
                    self._hit_queue.put(ScanHit(
                        artifact_type="Deep Recovery Match",
                        path="RECOVERY_ENGINE",
                        addresses={"btc": match["address"]},
                        balances={},
                        metadata={"type": match["type"], "value": match["value"], "priority": "CRITICAL"},
                        timestamp=datetime.now(timezone.utc)
                    ))

        # 2. Filesystem Scan
        for root_path in self.scan_paths:
            if not self.is_running: break
            expanded_path = os.path.expanduser(root_path)
            if not os.path.exists(expanded_path): continue

            for root, dirs, files in os.walk(expanded_path):
                if not self.is_running: break

                # Respect PAUSE
                while self.is_paused and self.is_running:
                    time.sleep(1)

                for file in files:
                    if not self.is_running: break
                    self.stats["files_scanned"] += 1
                    full_path = os.path.join(root, file)

                    matched = False
                    for pattern, name in self.WALLETS_MAP.items():
                        if "*" in pattern:
                            import fnmatch
                            if fnmatch.fnmatch(file, pattern):
                                self._process_artifact(full_path, name)
                                matched = True
                                break
                        elif file == pattern:
                            self._process_artifact(full_path, name)
                            matched = True
                            break

                    if not matched and file.lower().endswith(('.key', '.txt', '.json', '.bak', '.log', '.csv', '.wallet', '.db', '.dat')):
                        self._scan_file_content(full_path)

    def _process_artifact(self, filepath: str, artifact_type: str):
        self.stats["artifacts_found"] += 1
        self._hit_queue.put(ScanHit(
            artifact_type=artifact_type,
            path=filepath,
            addresses={},
            balances={},
            metadata={"size": os.path.getsize(filepath)},
            timestamp=datetime.now(timezone.utc)
        ))

    def _scan_file_content(self, filepath: str):
        try:
            if os.path.getsize(filepath) > 1024 * 1024: return
            with open(filepath, 'r', errors='ignore') as f:
                content = f.read()

            found_keys = []
            for ktype, pattern in self.patterns.items():
                matches = pattern.findall(content)
                for m in matches:
                    if (ktype, m) not in found_keys:
                        found_keys.append((ktype, m))

            if found_keys:
                for ktype, val in found_keys:
                    if ktype.startswith('address'):
                        if val in self._richlist:
                            self.stats["richlist_hits"] += 1
                            chain = ktype.split('_')[-1] if '_' in ktype else 'btc'
                            if chain == 'bech32': chain = 'btc'
                            self._hit_queue.put(ScanHit(
                                artifact_type=f"Richlist Hit ({ktype})",
                                path=filepath,
                                addresses={chain: val},
                                balances={},
                                metadata={"match": val, "priority": "CRITICAL"},
                                timestamp=datetime.now(timezone.utc)
                            ))
                        continue

                    self.stats["keys_extracted"] += 1
                    if self.assistant and hasattr(self.assistant, 'key_reducer') and self.assistant.key_reducer:
                        self.assistant.key_reducer.feed_text(val, source=f"scan:{filepath}")

                    self._hit_queue.put(ScanHit(
                        artifact_type=f"Extracted {ktype}",
                        path=filepath,
                        addresses={},
                        balances={},
                        metadata={"raw_match": val[:16] + "..."},
                        timestamp=datetime.now(timezone.utc)
                    ))
        except Exception: pass

    def hits(self) -> Iterator[ScanHit]:
        while self.is_running or not self._hit_queue.empty():
            try: yield self._hit_queue.get(timeout=1)
            except queue.Empty: continue
