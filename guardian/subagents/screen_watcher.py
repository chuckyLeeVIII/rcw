"""
ScreenWatcherAgent - Monitors screen text for accidental key exposure
"""

import time
import threading
import mss
import pytesseract
from PIL import Image
from typing import Callable, Optional

class ScreenWatcherAgent:
    """
    Monitors FULL screen text via OCR for key leaks while the app is running.
    Alerts the orchestrator if a key-like string is detected.
    """

    def __init__(self, assistant=None, interval: float = 5.0):
        self.assistant = assistant
        self.interval = interval
        self._running = False
        self._thread = None
        try:
            self._sct = mss.mss()
        except Exception:
            self._sct = None

    def _capture_and_scan(self, force=False):
        """Capture full screen and run OCR to find keys"""
        if not self._sct: return
        if not self._running and not force: return

        try:
            # Capture full screen
            screenshot = self._sct.grab(self._sct.monitors[0])
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

            # OCR
            text = pytesseract.image_to_string(img)

            if text.strip() and self.assistant:
                # Specialized patterns for screen reader
                patterns = {
                    'mnemonic': r'\b(?:[a-z]{3,10}\s+){11,23}[a-z]{3,10}\b',
                    'hex64': r'\b[0-9a-fA-F]{64}\b',
                    'wif': r'\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b',
                    'sss_shard': r'\b(?:shard|part|share)_[0-9a-fA-F]{16,}\b'
                }

                found = False
                import re
                for name, p in patterns.items():
                    if re.search(p, text, re.IGNORECASE):
                        found = True
                        break

                if found or force:
                    self.assistant.feed_text(text, source="screen_reader", context="Manual Interaction" if force else "Background Monitor")
        except Exception as e:
            # OCR tooling missing or capture failed; keep noise low but observable
            print(f"[ScreenWatcher] capture/OCR failed: {type(e).__name__}: {e}")

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

    def snapshot(self):
        """Take a manual snapshot of the screen"""
        self._capture_and_scan(force=True)

    @property
    def is_running(self) -> bool:
        return self._running
