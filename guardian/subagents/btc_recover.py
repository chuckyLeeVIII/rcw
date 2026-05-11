import hashlib
import itertools
import re
import traceback
from typing import Dict, Optional, List, Set, Iterator
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, Bip32Secp256k1
)

def btc_from_hex(hex_key: str) -> Optional[Dict[str, str]]:
    """Derive BTC addresses from hex private key across Legacy, SegWit, and Nested SegWit"""
    try:
        priv_bytes = bytes.fromhex(hex_key)
        if len(priv_bytes) != 32:
            return None

        # Legacy (P2PKH) - Compressed
        bip44_ctx = Bip44.FromPrivateKey(priv_bytes, Bip44Coins.BITCOIN)
        p2pkh = bip44_ctx.PublicKey().ToAddress()

        # Legacy (P2PKH) - Uncompressed
        pub_key_bytes_uncomp = bip44_ctx.PublicKey().RawUncompressed().ToBytes()
        p2pkh_uncomp = P2PKHAddr.EncodeKey(pub_key_bytes_uncomp, net_ver=b'\x00')

        # Nested SegWit (P2SH-P2WPKH)
        bip49_ctx = Bip49.FromPrivateKey(priv_bytes, Bip49Coins.BITCOIN)
        p2sh_p2wpkh = bip49_ctx.PublicKey().ToAddress()

        # SegWit (P2WPKH)
        bip84_ctx = Bip84.FromPrivateKey(priv_bytes, Bip84Coins.BITCOIN)
        p2wpkh = bip84_ctx.PublicKey().ToAddress()

        # WIF
        wif_comp = WifEncoder.Encode(priv_bytes, pub_key_mode=WifPubKeyModes.COMPRESSED)
        wif_uncomp = WifEncoder.Encode(priv_bytes, pub_key_mode=WifPubKeyModes.UNCOMPRESSED)

        return {
            'private_key_hex': hex_key,
            'wif_compressed': wif_comp,
            'wif_uncompressed': wif_uncomp,
            'btc_p2pkh': p2pkh,
            'btc_p2pkh_uncompressed': p2pkh_uncomp,
            'btc_p2sh_p2wpkh': p2sh_p2wpkh,
            'btc_p2wpkh': p2wpkh,
            'btc': p2wpkh,
            'addresses': {
                'btc': p2wpkh,
                'btc_legacy': p2pkh,
                'btc_legacy_uncompressed': p2pkh_uncomp,
                'btc_nested': p2sh_p2wpkh
            }
        }
    except Exception as e:
        # print(f"Error deriving addresses: {e}")
        return None

def btc_from_wif(wif: str) -> Optional[Dict[str, str]]:
    """Decode WIF to hex and derive addresses"""
    try:
        # WifDecoder.Decode returns bytes if it's a newer version or a tuple (bytes, pub_key_mode)
        decoded = WifDecoder.Decode(wif)
        if isinstance(decoded, tuple):
            priv_bytes = decoded[0]
        else:
            priv_bytes = decoded

        hex_key = priv_bytes.hex()
        res = btc_from_hex(hex_key)
        if res:
            res['source_wif'] = wif
        return res
    except Exception:
        return None

def generate_typos(token: str) -> Set[str]:
    """Generate common typos for a given token"""
    typos = {token}

    # 1. Omissions
    for i in range(len(token)):
        typos.add(token[:i] + token[i+1:])

    # 2. Swaps
    for i in range(len(token) - 1):
        typos.add(token[:i] + token[i+1] + token[i] + token[i+2:])

    # 3. Substitutions (Common)
    subs = {
        'a': '@', '@': 'a',
        's': '$', '$': 's',
        'o': '0', '0': 'o',
        'i': '1', '1': 'i',
        'e': '3', '3': 'e',
        't': '7', '7': 't'
    }
    token_list = list(token.lower())
    for i, char in enumerate(token_list):
        if char in subs:
            new_token = token_list[:]
            new_token[i] = subs[char]
            typos.add("".join(new_token))

    return typos

def expand_tokens_exhaustive(tokens: List[str], max_length: int = 3) -> Iterator[str]:
    """Exhaustively expand tokens with typos and combinations"""
    base_expanded = set()
    for t in tokens:
        base_expanded.update(generate_typos(t))
        # Case variations
        base_expanded.add(t.lower())
        base_expanded.add(t.upper())
        base_expanded.add(t.capitalize())

    # Combinations
    for length in range(1, max_length + 1):
        for combo in itertools.permutations(base_expanded, length):
            yield "".join(combo)

def run_btcrecover_scan(
    wallet_file: str = None,
    passwords: List[str] = None,
    tokenlist: List[str] = None,
    target_addresses: List[str] = None,
    exhaustive: bool = False
) -> Dict:
    """
    Enhanced BTCRecover-style exhaustive scan.
    """
    targets = set(target_addresses or [])
    print(f"[BTCRecover] Starting scan. Target addresses: {len(targets)}")
    results = {"found": False, "attempts": 0, "matches": []}

    if not targets and not exhaustive:
        return results

    # Determine candidate source
    candidates = expand_tokens_exhaustive(tokenlist or passwords or [], max_length=2 if exhaustive else 1)

    validator = Bip39MnemonicValidator()

    for pwd in candidates:
        results["attempts"] += 1

        # 1. Mnemonic check
        try:
            if validator.IsValid(pwd):
                seed = Bip39SeedGenerator(pwd).Generate()
                # Deriving first address for quick check
                ctx = Bip84.FromSeed(seed, Bip84Coins.BITCOIN).DeriveDefaultPath()
                addr = ctx.PublicKey().ToAddress()
                if addr in targets:
                    results["found"] = True
                    results["matches"].append({"type": "mnemonic", "value": pwd, "address": addr})
                    if not exhaustive: return results
        except Exception:
            pass

        # 2. Raw Hex check
        if len(pwd) == 64 and all(c in "0123456789abcdefABCDEF" for c in pwd):
            res = btc_from_hex(pwd)
            if res:
                for addr in res['addresses'].values():
                    if addr in targets:
                        results["found"] = True
                        results["matches"].append({"type": "hex_key", "value": pwd, "address": addr})
                        if not exhaustive: return results

        # 3. Hash-based (SHA256)
        hashed_key = hashlib.sha256(pwd.encode()).hexdigest()
        res = btc_from_hex(hashed_key)
        if res:
            for addr in res['addresses'].values():
                if addr in targets:
                    results["found"] = True
                    results["matches"].append({"type": "password_hash", "value": pwd, "address": addr})
                    if not exhaustive: return results

    return results
