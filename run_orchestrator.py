#!/usr/bin/env python3
"""
PyGUI Wallet - Multimodal Orchestrator Entry Point

Runs all sub-agents:
- MixHunterEngine: High-speed key generation
- KeyReducerAgent: Continuous key normalization
- ScreenWatcherAgent: Screen monitoring

Usage:
    python run_orchestrator.py --config config.yaml
    python run_orchestrator.py --coin eth --threads 16 --min-balance 2000
"""

import argparse
import sys
import time
import signal
from pathlib import Path

from multimodal_orchestrator import MultimodalOrchestrator
from vault.service import Vault


def parse_args():
    parser = argparse.ArgumentParser(description='PyGUI Wallet - Multimodal Key Hunter')
    
    # MixHunter args
    parser.add_argument('--coin', nargs='+', default=['eth'],
                       help='Coins to hunt (eth, ltc, dash, doge)')
    parser.add_argument('--method', choices=['random_number', 'random_words', 'random_hex'],
                       default='random_hex', help='Key generation method')
    parser.add_argument('--threads', type=int, default=8, help='Number of hunter threads')
    parser.add_argument('--min-balance', type=float, default=2000.0,
                       help='Minimum USD balance to report')
    parser.add_argument('--targets', type=str, help='Path to targets.txt file')
    parser.add_argument('--output', type=str, default='Found_Successfully.txt',
                       help='Output file for found keys')
    
    # KeyReducer args
    parser.add_argument('--watch-files', nargs='+', help='Files to watch for keys')
    
    # General args
    parser.add_argument('--vault-path', default='vault.json', help='Vault storage path')
    parser.add_argument('--config', type=str, help='Path to config.yaml')
    
    return parser.parse_args()


def build_config(args) -> dict:
    """Build config from CLI args"""
    return {
        'mixhunter': {
            'targets_file': args.targets,
            'coins': args.coin,
            'method': args.method,
            'threads': args.threads,
            'dedup': True,
            'min_balance_usd': args.min_balance,
            'output_file': args.output,
        },
        'key_reducer': {
            'min_balance_usd': args.min_balance,
            'watch_files': args.watch_files or [],
        },
        'balance_checkers': {},  # TODO: Add balance checkers
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
        print(f"KEY FOUND!")
        print(f"Source: {event.source}")
        print(f"Data: {event.data}")
        print(f"{'='*60}\n")
    
    orchestrator.on_event('key_hunt:found', on_key_found)
    orchestrator.on_event('key_reducer:found', on_key_found)
    
    # Handle graceful shutdown
    def signal_handler(sig, frame):
        print("\n[Main] Shutting down...")
        orchestrator.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Start
    print(f"[Main] Starting PyGUI Wallet Orchestrator")
    print(f"[Main] Coins: {', '.join(args.coin)}")
    print(f"[Main] Method: {args.method}")
    print(f"[Main] Threads: {args.threads}")
    print(f"[Main] Min Balance: ${args.min_balance}")
    print()
    
    orchestrator.start()
    
    # Status loop
    try:
        while True:
            time.sleep(10)
            status = orchestrator.get_status()
            
            mh = status.get('mixhunter', {})
            print(
                f"\r[Status] Keys: {mh.get('keys_generated', 0):,} | "
                f"Rate: {mh.get('keys_per_second', 0):.0f}/s | "
                f"Found: {mh.get('hits_found', 0)} | "
                f"Value: ${mh.get('total_balance_usd', 0):.2f}",
                end='',
                flush=True,
            )
    except KeyboardInterrupt:
        print("\n[Main] Interrupted")
        orchestrator.stop()


if __name__ == '__main__':
    main()
