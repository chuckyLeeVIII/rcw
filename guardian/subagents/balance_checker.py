import requests
from typing import Dict, Any, Union

def get_balance(address: str, chain: str) -> float:
    """Check balance using multiple public APIs"""
    try:
        if chain.lower() in ('btc', 'bitcoin'):
            resp = requests.get(f"https://blockstream.info/api/address/{address}", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get('chain_stats', {})
                return (stats.get('funded_txo_sum', 0) - stats.get('spent_txo_sum', 0)) / 1e8

        elif chain.lower() in ('eth', 'ethereum'):
            # Using a public RPC
            resp = requests.post(
                "https://cloudflare-eth.com",
                json={"jsonrpc":"2.0","method":"eth_getBalance","params":[address, "latest"],"id":1},
                timeout=10
            )
            if resp.status_code == 200:
                return int(resp.json()['result'], 16) / 1e18
    except Exception:
        pass
    return 0.0

def eth_balance_etherscan(address: str, api_key: str = "FREE_KEY") -> Dict[str, Any]:
    """Check ETH balance and tx count via Etherscan"""
    try:
        url = f"https://api.etherscan.io/api?module=account&action=balance&address={address}&tag=latest&apikey={api_key}"
        resp = requests.get(url, timeout=10)
        bal = 0.0
        if resp.status_code == 200:
            bal = int(resp.json().get('result', 0)) / 1e18

        return {"confirmed": bal}
    except Exception:
        return {"confirmed": 0.0}
