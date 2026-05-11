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

    def _capture_and_scan(self):
        """Capture full screen and run OCR to find keys"""
        if not self._sct: return
        try:
            # Capture full screen
            screenshot = self._sct.grab(self._sct.monitors[0])
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")

            # OCR
            text = pytesseract.image_to_string(img)

            if text.strip() and self.assistant:
                # Feed to KeyReducer (handled via assistant/orchestrator)
                # It will check against patterns and balances
                self.assistant.feed_text(text, source="screen_watcher", context="Full Screen OCR")
        except Exception as e:
            # Silently fail if OCR tools (tesseract) are not installed in environment
            # but log for debugging if needed
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
