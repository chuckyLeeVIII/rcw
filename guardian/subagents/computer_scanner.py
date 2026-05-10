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

        # Key regexes for file content scanning
        self.patterns = {
            'hex64': re.compile(r'\b[0-9a-fA-F]{64}\b'),
            'wif': re.compile(r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
            'wif_testnet': re.compile(r'\b[9cC][1-9A-HJ-NP-Za-km-z]{50,51}\b'),
            'xprv': re.compile(r'\b(?:xprv|tprv|yprv|zprv)[1-9A-HJ-NP-Za-km-z]{107,111}\b'),
            'mnemonic': re.compile(r'\b(?:[a-z]{3,10}\s+){11,23}[a-z]{3,10}\b'),
            'txid': re.compile(r'\b[0-9a-fA-F]{64}\b'), # Same as hex64 but kept for context
            'shard': re.compile(r'\b(?:shard|part|share)_[0-9a-fA-F]{16,}\b', re.IGNORECASE),
        }

    def _load_richlist(self):
        if self.richlist_path and os.path.exists(self.richlist_path):
            try:
                with open(self.richlist_path, 'r') as f:
                    self._richlist = set(line.strip() for line in f if line.strip())
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
                self.stats["keys_extracted"] += len(found_keys)
                for ktype, key in found_keys:
                    if self.assistant and hasattr(self.assistant, 'key_reducer') and self.assistant.key_reducer:
                        # Pipe to key_reducer for full normalization and balance checking
                        self.assistant.key_reducer.feed_text(key, source=f"scan:{filepath}")

                    # Also create a direct hit for immediate UI feedback
                    hit = ScanHit(
                        artifact_type=f"Extracted {ktype}",
                        path=filepath,
                        addresses={}, # To be filled by orchestrator
                        balances={},
                        metadata={"raw_match": key[:16] + "..." if len(key) > 16 else key},
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
