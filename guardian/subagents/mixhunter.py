"""
MixHunterEngine - High-speed key generation and hunting
"""

import time
import threading
import random
import hashlib
from typing import List, Set, Optional

class MixHunterEngine:
    """
    Background worker for generating and checking keys against a target list.
    """

    def __init__(self, target_addresses: Optional[Set[str]] = None, assistant=None):
        self.target_addresses = target_addresses or set()
        self.assistant = assistant
        self._running = False
        self._threads = []
        self.stats = {"generated": 0, "hits": 0}

    def _generate_random_hex(self) -> str:
        return hashlib.sha256(str(random.getrandbits(256)).encode()).hexdigest()

    def _worker(self):
        while self._running:
            key = self._generate_random_hex()
            self.stats["generated"] += 1

            if self.assistant:
                # [DeepTools Engine] Feed to KeyReducer for exhaustive filtering
                self.assistant.feed_text(key, source="mixhunter")

            time.sleep(0.001) # Yield

    def start(self, num_workers: int = 2):
        if self._running: return
        self._running = True
        for i in range(num_workers):
            t = threading.Thread(target=self._worker, daemon=True)
            t.start()
            self._threads.append(t)
        print(f"[MixHunter] Started with {num_workers} workers")

    def stop(self):
        self._running = False
        for t in self._threads:
            t.join(timeout=1)
        print("[MixHunter] Stopped")
