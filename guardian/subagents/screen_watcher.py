"""
ScreenWatcherAgent - Monitors screen text for accidental key exposure
"""

import time
import threading
from typing import Callable, Optional

class ScreenWatcherAgent:
    """
    Monitors screen text (via OCR or system hooks) for key leaks.
    Alerts the orchestrator if a key-like string is detected.
    """

    def __init__(self, assistant=None, interval: float = 2.0):
        self.assistant = assistant
        self.interval = interval
        self._running = False
        self._thread = None

    def _capture_and_scan(self):
        """Placeholder for actual OCR/Screen capture logic"""
        # In a real implementation, this would use pytesseract or similar
        # to scan the screen for patterns matching KeyReducerAgent.PATTERNS
        pass

    def _worker(self):
        while self._running:
            self._capture_and_scan()
            time.sleep(self.interval)

    def start(self):
        if self._running: return
        self._running = True
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()
        print("[ScreenWatcher] Started screen monitoring")

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=1)
        print("[ScreenWatcher] Stopped")
