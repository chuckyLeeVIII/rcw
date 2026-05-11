import hashlib
import itertools
from typing import Dict, Optional, List
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, Bip32Secp256k1
)

def btc_from_hex(hex_key: str) -> Optional[Dict[str, str]]:
    """Derive BTC addresses from hex private key across Legacy, SegWit, and Nested SegWit"""
    try:
        priv_bytes = bytes.fromhex(hex_key)

        # Legacy (P2PKH) - Compressed
        bip44_ctx = Bip44.FromPrivateKey(priv_bytes, Bip44Coins.BITCOIN)
        p2pkh = bip44_ctx.PublicKey().ToAddress()

        # Legacy (P2PKH) - Uncompressed
        # Bip44 internally uses compressed. For uncompressed we use raw keys.
        bip32_ctx = Bip32Secp256k1.FromPrivateKey(priv_bytes)
        pub_key_bytes_uncomp = bip32_ctx.PublicKey().RawUncompressed().ToBytes()
        p2pkh_uncomp = P2PKHAddr.Encode(pub_key_bytes_uncomp)

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

def run_btcrecover_scan(
    wallet_file: str = None,
    passwords: List[str] = None,
    tokenlist: List[str] = None,
    target_addresses: List[str] = None
) -> Dict:
    """
    Real BTCRecover-style password recovery logic.
    Supports:
    - Password list scanning
    - Token-based password construction (simple version)
    - Target address matching
    """
    print(f"[BTCRecover] Starting scan. Target addresses: {len(target_addresses or [])}")

    if not targets and not exhaustive:
        return results

    # Simple token expansion if tokenlist provided
    if tokenlist and len(tokenlist) <= 5: # Limit for safety
        for length in range(1, 3):
            for combo in itertools.permutations(tokenlist, length):
                candidates.add("".join(combo))

    results = {"found": False, "attempts": 0, "matches": []}

    for pwd in candidates:
        results["attempts"] += 1
        # In a real wallet.dat scenario, we would try to decrypt the master key here.
        # Since we're in a general recovery tool, we'll try hashing the pwd as a potential seed/key

        # 1. Try pwd as mnemonic
        if Bip39MnemonicValidator().IsValid(pwd):
            seed = Bip39SeedGenerator(pwd).Generate()
            # Deriving first address to check
            ctx = Bip84.FromSeed(seed, Bip84Coins.BITCOIN).DeriveDefaultPath()
            addr = ctx.PublicKey().ToAddress()
            if target_addresses and addr in target_addresses:
                results["found"] = True
                results["matches"].append({"type": "mnemonic", "value": pwd, "address": addr})
                return results

        # 2. Try pwd as raw private key (if it's hex)
        if len(pwd) == 64 and all(c in "0123456789abcdefABCDEF" for c in pwd):
            res = btc_from_hex(pwd)
            if res:
                for addr in res['addresses'].values():
                    if target_addresses and addr in target_addresses:
                        results["found"] = True
                        results["matches"].append({"type": "hex_key", "value": pwd, "address": addr})
                        return results

        # 3. Simple hash-based key derivation (common in some old scripts)
        hashed_key = hashlib.sha256(pwd.encode()).hexdigest()
        res = btc_from_hex(hashed_key)
        if res:
            for addr in res['addresses'].values():
                if target_addresses and addr in target_addresses:
                    results["found"] = True
                    results["matches"].append({"type": "password_hash", "value": pwd, "address": addr})
                    return results

    return results
