import hashlib
import itertools
from typing import Dict, Optional, List, Set
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, Bip32Secp256k1, Bip44ConfGetter
)

def btc_from_hex(hex_key: str) -> Optional[Dict[str, str]]:
    """Derive BTC addresses from hex private key across Legacy, SegWit, and Nested SegWit"""
    try:
        priv_bytes = bytes.fromhex(hex_key)

        # Legacy (P2PKH) - Compressed
        bip44_ctx = Bip44.FromPrivateKey(priv_bytes, Bip44Coins.BITCOIN)
        p2pkh = bip44_ctx.PublicKey().ToAddress()

        # Legacy (P2PKH) - Uncompressed
        bip32_ctx = Bip32Secp256k1.FromPrivateKey(priv_bytes)
        pub_key_bytes_uncomp = bip32_ctx.PublicKey().RawUncompressed().ToBytes()

        # Clean API for NetVer access
        net_ver = Bip44ConfGetter.GetConfig(Bip44Coins.BITCOIN).AddrParams().get('net_ver')
        p2pkh_uncomp = P2PKHAddr.EncodeKey(pub_key_bytes_uncomp, net_ver=net_ver)

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
    except Exception:
        return None

def btc_from_wif(wif: str) -> Optional[Dict[str, str]]:
    """Decode WIF to hex and derive addresses"""
    try:
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
    """Generate character-level mutations for a token"""
    typos = {token}
    chars = list(token)

    # 1. Omissions
    for i in range(len(chars)):
        typos.add("".join(chars[:i] + chars[i+1:]))

    # 2. Swaps
    for i in range(len(chars) - 1):
        c2 = chars[:]
        c2[i], c2[i+1] = c2[i+1], c2[i]
        typos.add("".join(c2))

    # 3. Common Substitutions
    subs = {'o': '0', '0': 'o', 'i': '1', '1': 'i', 'l': '1', 'e': '3', '3': 'e', 'a': '4', '4': 'a', 's': '5', '5': 's', 't': '7', '7': 't'}
    for i, c in enumerate(chars):
        if c.lower() in subs:
            c2 = chars[:]
            c2[i] = subs[c.lower()]
            typos.add("".join(c2))

    return typos

def generate_permutations(tokens: List[str], max_len: int = 3) -> Set[str]:
    """Generate token combinations and case variations"""
    perms = set()
    base_tokens = []
    for t in tokens:
        base_tokens.extend([t, t.lower(), t.upper(), t.capitalize()])

    base_tokens = list(set(base_tokens))
    for length in range(1, min(len(base_tokens), max_len) + 1):
        for combo in itertools.permutations(base_tokens, length):
            perms.add("".join(combo))
    return perms

def run_btcrecover_scan(
    wallet_file: str = None,
    passwords: List[str] = None,
    tokenlist: List[str] = None,
    target_addresses: List[str] = None,
    exhaustive: bool = False
) -> Dict:
    """
    Exhaustive BTC recovery logic.
    """
    results = {"found": False, "attempts": 0, "matches": []}
    targets = set(target_addresses or [])

    if not targets:
        return results

    candidates = set(passwords or [])

    if tokenlist:
        if exhaustive:
            # Deep search with typos and permutations
            for token in tokenlist:
                candidates.update(generate_typos(token))
            candidates.update(generate_permutations(list(candidates), max_len=2))
        else:
            # Simple permutations
            candidates.update(generate_permutations(tokenlist, max_len=2))

    for pwd in candidates:
        if not pwd: continue
        results["attempts"] += 1

        # Check potential candidates
        potential_keys = []

        # 1. As mnemonic
        if Bip39MnemonicValidator().IsValid(pwd):
            try:
                seed = Bip39SeedGenerator(pwd).Generate()
                # Derive common paths
                for coin in [Bip44Coins.BITCOIN, Bip49Coins.BITCOIN, Bip84Coins.BITCOIN]:
                    if coin == Bip44Coins.BITCOIN: ctx = Bip44.FromSeed(seed, coin)
                    elif coin == Bip49Coins.BITCOIN: ctx = Bip49.FromSeed(seed, coin)
                    else: ctx = Bip84.FromSeed(seed, coin)

                    addr = ctx.DeriveDefaultPath().PublicKey().ToAddress()
                    if addr in targets:
                        results["found"] = True
                        results["matches"].append({"type": "mnemonic", "value": pwd, "address": addr})
            except: pass

        # 2. As raw hex key
        if len(pwd) == 64 and all(c in "0123456789abcdefABCDEF" for c in pwd):
            potential_keys.append(pwd)

        # 3. As WIF
        res_wif = btc_from_wif(pwd)
        if res_wif:
            for addr in res_wif['addresses'].values():
                if addr in targets:
                    results["found"] = True
                    results["matches"].append({"type": "wif", "value": pwd, "address": addr})

        # 4. As password hash
        hashed_key = hashlib.sha256(pwd.encode()).hexdigest()
        potential_keys.append(hashed_key)

        for k in potential_keys:
            res = btc_from_hex(k)
            if res:
                for addr in res['addresses'].values():
                    if addr in targets:
                        results["found"] = True
                        results["matches"].append({"type": "private_key", "value": pwd, "address": addr, "hex": k})

        if results["found"] and not exhaustive:
            break

    return results
