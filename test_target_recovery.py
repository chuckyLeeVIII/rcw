import time
import requests
import json

def test_recovery_with_target():
    # 1. Start Orchestrator (assumed running via run_orchestrator.py in background or simulated here)
    # We will test the API endpoints

    target_addr = "1PRQwKHJ4gsZ5Mou3xNkSMrHjBgNbD2E8A"
    print(f"Testing recovery with target: {target_addr}")

    try:
        # Start scan with target
        res = requests.post("http://127.0.0.1:8000/api/scan/start", json={
            "paths": ["/tmp"],
            "richlist": target_addr
        })
        print(f"Start Scan Status: {res.status_code}")

        # Wait a bit for processing
        time.sleep(5)

        # Check status
        status = requests.get("http://127.0.0.1:8000/api/status").json()
        print(f"Orchestrator Stats: {json.dumps(status.get('stats'), indent=2)}")

        # Check results
        results = requests.get("http://127.0.0.1:8000/api/scan/results?limit=10").json()
        found = False
        for hit in results.get('hits', []):
            if hit.get('metadata', {}).get('match') == target_addr:
                found = True
                print(f"SUCCESS: Target address found in scan results with balance info: {hit.get('total_usd')}")
                break

        if not found:
            print("FAILURE: Target address not found in results (is api_server.py running?)")

    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_recovery_with_target()
