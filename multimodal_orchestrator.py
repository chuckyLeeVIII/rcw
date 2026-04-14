"""
MultimodalOrchestrator - Wires all sub-agents together

This is the core orchestrator that:
1. Runs MixHunterEngine for key generation
2. Runs KeyReducerAgent for continuous key normalization
3. Runs ScreenWatcherAgent for monitoring screen text
4. Routes all events through a central event bus
5. Exposes safe metadata to assistant (no raw keys)
"""

import time
import threading
import queue
from typing import Callable, Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timezone

from mixhunter.engine import MixHunterEngine, KeyHit
from guardian.subagents.key_reducer import KeyReducerAgent, KeyFound
from vault.service import Vault


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
        self.mixhunter: Optional[MixHunterEngine] = None
        self.key_reducer: Optional[KeyReducerAgent] = None
        
        # State
        self._running = False
        self._threads: List[threading.Thread] = []
        
        # Stats
        self._stats = {
            'events_processed': 0,
            'keys_found': 0,
            'total_value_usd': 0.0,
            'start_time': 0.0,
        }
    
    def _setup_mixhunter(self):
        """Setup MixHunterEngine from config"""
        mh_config = self.config.get('mixhunter', {})
        
        self.mixhunter = MixHunterEngine(
            targets_file=mh_config.get('targets_file'),
            coins=mh_config.get('coins', ['eth']),
            method=mh_config.get('method', 'random_hex'),
            num_threads=mh_config.get('threads', 8),
            dedup=mh_config.get('dedup', True),
            min_balance_usd=mh_config.get('min_balance_usd', 2000.0),
            output_file=mh_config.get('output_file', 'Found_Successfully.txt'),
            balance_checkers=self.config.get('balance_checkers', {}),
        )
    
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
    
    def start(self):
        """Start all sub-agents"""
        if self._running:
            return
        
        print("[Orchestrator] Starting all sub-agents...")
        
        # Setup sub-agents
        self._setup_mixhunter()
        self._setup_key_reducer()
        
        self._running = True
        self._stats['start_time'] = time.time()
        
        # Start MixHunter
        if self.mixhunter:
            self.mixhunter.start()
            
            # Start MixHunter hit consumer
            t = threading.Thread(target=self._consume_mixhunter_hits, daemon=True)
            t.start()
            self._threads.append(t)
        
        # Start KeyReducer
        if self.key_reducer:
            self.key_reducer.start(num_workers=4)
            
            # Start KeyReducer hit consumer
            t = threading.Thread(target=self._consume_key_reducer_hits, daemon=True)
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
        
        if self.mixhunter:
            self.mixhunter.stop()
        
        if self.key_reducer:
            self.key_reducer.stop()
        
        for t in self._threads:
            t.join(timeout=2)
        
        self._threads.clear()
        print("[Orchestrator] All sub-agents stopped")
    
    def _consume_mixhunter_hits(self):
        """Consume hits from MixHunter"""
        if not self.mixhunter:
            return
        
        for hit in self.mixhunter.hits():
            if not self._running:
                break
            
            event = OrchestratorEvent(
                event_type="key_hunt:found",
                source="mixhunter",
                data={
                    'coin': hit.coin,
                    'address': hit.address,
                    'balance': hit.balance,
                    'balance_usd': hit.balance_usd,
                    'timestamp': hit.timestamp.isoformat(),
                    'method': hit.method,
                },
                timestamp=datetime.now(timezone.utc),
            )
            
            # Store key in vault (raw key stays here)
            self.vault.store_key(
                key=hit.private_key,
                source="mixhunter",
                metadata={
                    'coin': hit.coin,
                    'address': hit.address,
                    'balance': hit.balance,
                    'balance_usd': hit.balance_usd,
                }
            )
            
            self._event_queue.put_nowait(event)
    
    def _consume_key_reducer_hits(self):
        """Consume hits from KeyReducer"""
        if not self.key_reducer:
            return
        
        for key_found in self.key_reducer.found_keys():
            if not self._running:
                break
            
            event = OrchestratorEvent(
                event_type="key_reducer:found",
                source="key_reducer",
                data={
                    'key_type': key_found.key_type,
                    'addresses': key_found.addresses,
                    'balances': key_found.balances,
                    'total_usd': key_found.total_usd,
                    'source': key_found.source,
                    'timestamp': key_found.timestamp.isoformat(),
                },
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
                    self._stats['total_value_usd'] += event.data.get('balance_usd', 0) or event.data.get('total_usd', 0)
                
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
        }
        
        if self.mixhunter:
            mh_stats = self.mixhunter.stats
            status['mixhunter'] = {
                'keys_generated': mh_stats.keys_generated,
                'keys_per_second': mh_stats.keys_per_second,
                'hits_found': mh_stats.hits_found,
                'total_balance_usd': mh_stats.total_balance_usd,
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
