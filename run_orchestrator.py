#!/usr/bin/env python3
"""
PyGUI Wallet - Multimodal Orchestrator Entry Point

Runs all sub-agents:
- KeyReducerAgent: Continuous key normalization
- ComputerScannerAgent: Non-destructive filesystem scan with BTCRecover filters

Usage:
    python run_orchestrator.py --config config.yaml
    python run_orchestrator.py --scan --scan-paths /home/user --scan-workers 4
"""

import argparse
import sys
import time
import signal
import threading
from pathlib import Path

from multimodal_orchestrator import MultimodalOrchestrator, quick_check_balance
from vault.service import Vault


def parse_args():
    parser = argparse.ArgumentParser(description='PyGUI Wallet - Multimodal Recovery')
    
    # KeyReducer args
    parser.add_argument('--watch-files', nargs='+', help='Files to watch for keys')
    
    # ComputerScanner args
    parser.add_argument('--scan', action='store_true', help='Start computer scanner on startup')
    parser.add_argument('--scan-paths', nargs='+', help='Paths to scan (default: home dir)')
    parser.add_argument('--richlist', type=str, help='Path to richlist.txt for address matching')
    parser.add_argument('--scan-workers', type=int, default=4, help='Scanner worker threads')
    parser.add_argument('--tokenlist', type=str, help='Path to btcrecover-style tokenlist for password recovery')
    parser.add_argument('--deep-scan', action='store_true', help='Enable exhaustive deep search (char mutations, perms)')
    parser.add_argument('--recovery-tokens', nargs='+', help='Tokens to use for exhaustive recovery search')
    
    # API Server args
    parser.add_argument('--api', action='store_true', help='Run FastAPI server')
    parser.add_argument('--api-port', type=int, default=8000, help='API server port')
    parser.add_argument('--api-host', type=str, default='127.0.0.1', help='API server host')
    
    # General args
    parser.add_argument('--vault-path', default='vault.json', help='Vault storage path')
    parser.add_argument('--config', type=str, help='Path to config.yaml')
    
    return parser.parse_args()


def build_config(args) -> dict:
    """Build config from CLI args"""

    # Define balance checkers using MultimodalOrchestrator's quick_check_balance
    def make_checker(coin):
        return lambda addr: quick_check_balance(addr, coin).get('balance', 0.0)

    balance_checkers = {
        'btc': make_checker('btc'),
        'btc_p2pkh': make_checker('btc'),
        'btc_p2pkh_uncompressed': make_checker('btc'),
        'btc_p2sh': make_checker('btc'),
        'eth': make_checker('eth'),
        'ltc': make_checker('ltc'),
        'doge': make_checker('doge'),
        'dash': make_checker('dash'),
        'bch': make_checker('bch'),
        'etc': make_checker('etc'),
        'tbtc': make_checker('tbtc'),
    }

    return {
        'key_reducer': {
            'watch_files': args.watch_files or [],
        },
        'computer_scanner': {
            'scan_paths': args.scan_paths or [str(Path.home())],
            'min_balance_usd': 0.0,
            'richlist_path': args.richlist,
            'tokenlist_path': args.tokenlist,
            'deep_scan': args.deep_scan,
            'btc_recover_tokens': args.recovery_tokens or [],
        },
        'balance_checkers': balance_checkers,
    }


def main():
    args = parse_args()
    config = build_config(args)
    
    # Initialize vault
    vault = Vault(vault_path=args.vault_path)
    
    # Initialize orchestrator
    orchestrator = MultimodalOrchestrator(
        config=config,
        vault=vault,
        assistant_callback=lambda event: print(
            f"[Event] {event.event_type}: {event.data.get('address', event.data.get('key_type', 'unknown'))} "
            f"= ${event.data.get('balance_usd', event.data.get('total_usd', 0)):.2f}"
        ),
    )
    
    # Register event handlers
    def on_key_found(event):
        print(f"\n{'='*60}")
        print(f"ARTIFACT FOUND!")
        print(f"Source: {event.source}")
        print(f"Data: {event.data}")
        print(f"{'='*60}\n")
    
    orchestrator.on_event('key_reducer:found', on_key_found)
    orchestrator.on_event('computer_scan:found', on_key_found)
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        print("\n[Main] Shutting down...")
        orchestrator.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start
    print(f"[Main] Starting PyGUI Wallet Orchestrator")
    print()
    
    orchestrator.start()
    
    # Optionally start computer scanner immediately
    if args.scan and orchestrator.computer_scanner:
        orchestrator.computer_scanner.start(num_workers=args.scan_workers)
    
    # Optionally run API server
    if args.api:
        import uvicorn
        from api_server import app
        
        # Inject orchestrator into API server module
        import api_server
        api_server.orchestrator = orchestrator
        
        print(f"[Main] Starting API server on {args.api_host}:{args.api_port}")
        api_thread = threading.Thread(
            target=lambda: uvicorn.run(app, host=args.api_host, port=args.api_port, log_level="warning"),
            daemon=True,
        )
        api_thread.start()
    
    # Status loop
    try:
        while True:
            time.sleep(10)
            status = orchestrator.get_status()
            
            cs = status.get('computer_scanner', {})
            print(
                f"\r[Status] Scan Files: {cs.get('files_scanned', 0):,} | "
                f"Artifacts: {cs.get('artifacts_found', 0)} | "
                f"Keys: {cs.get('keys_extracted', 0)} | "
                f"Richlist: {cs.get('richlist_hits', 0)}",
                end='',
                flush=True,
            )
    except KeyboardInterrupt:
        print("\n[Main] Interrupted")
        orchestrator.stop()


if __name__ == '__main__':
    main()
