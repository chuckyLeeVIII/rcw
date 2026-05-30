import os
import time
import threading
from guardian.subagents.computer_scanner import ComputerScannerAgent

def test_deep_search_integration():
    """
    Verify that feeding intelligence to the scanner triggers the recovery loop
    and finds a match using the exhaustive engine.
    """
    print("Initializing ComputerScannerAgent for integration test...")

    # Target address for private key 0x1 (Legacy P2PKH)
    target_address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"

    scanner = ComputerScannerAgent(
        scan_paths=[], # No filesystem scan
        deep_scan=True,
        skip_balance_check=True
    )

    scanner.add_to_richlist(target_address)

    # Start scanner
    scanner.start(num_workers=1)

    try:
        print("Feeding intelligence (token '0000000000000000000000000000000000000000000000000000000000000001')...")
        # Token for private key 0x1
        token = "0000000000000000000000000000000000000000000000000000000000000001"
        scanner.feed_intelligence(tokens=[token])

        print("Waiting for recovery loop to find the match...")
        # Wait up to 30 seconds for the recovery loop to process
        start_time = time.time()
        match_found = False

        while time.time() - start_time < 30:
            for hit in scanner.hits():
                if hit.artifact_type.startswith("Recovery Match"):
                    print(f"Match found: {hit.addresses}")
                    if target_address in hit.addresses.values():
                        match_found = True
                        break
            if match_found:
                break
            time.sleep(1)

        assert match_found, "Exhaustive recovery engine failed to find the match within timeout"
        print("Integration test PASSED")

    finally:
        scanner.stop()

if __name__ == "__main__":
    test_deep_search_integration()
