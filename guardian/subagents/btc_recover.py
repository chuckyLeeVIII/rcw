import hashlib
import itertools
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, Optional, List, Set
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins, Bip86, Bip86Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, Bip32Secp256k1, Bip44ConfGetter, Bip44Changes, Bip32Utils
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

        # Taproot (P2TR)
        try:
            bip86_ctx = Bip86.FromPrivateKey(priv_bytes, Bip86Coins.BITCOIN)
            p2tr = bip86_ctx.PublicKey().ToAddress()
        except Exception: p2tr = None

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
            'btc_p2tr': p2tr,
            'btc': p2wpkh,
            'addresses': {
                'btc': p2wpkh,
                'btc_legacy': p2pkh,
                'btc_legacy_uncompressed': p2pkh_uncomp,
                'btc_nested': p2sh_p2wpkh,
                'btc_taproot': p2tr
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

    # 2. Swaps (adjacent and nearby)
    for i in range(len(chars) - 1):
        c2 = chars[:]
        c2[i], c2[i+1] = c2[i+1], c2[i]
        typos.add("".join(c2))
        if i < len(chars) - 2:
            c3 = chars[:]
            c3[i], c3[i+2] = c3[i+2], c3[i]
            typos.add("".join(c3))

    # 3. Common Substitutions
    subs_list = [
        {'o': '0', '0': 'o', 'i': '1', '1': 'i', 'l': '1', 'e': '3', '3': 'e',
         'a': '4', '4': 'a', 's': '5', '5': 's', 't': '7', '7': 't',
         'g': '9', '9': 'g', 'z': '2', '2': 'z', 'b': '8', '8': 'b'},
        {'s': '$', 'a': '@', 'i': '!', 'e': '€', 'b': '6', 'f': 'ph', 'v': 'u', 'u': 'v'}
    ]
    for subs in subs_list:
        for i, c in enumerate(chars):
            if c.lower() in subs:
                c2 = chars[:]
                c2[i] = subs[c.lower()]
                typos.add("".join(c2))

    # 4. Insertions (duplicate characters)
    for i in range(len(chars)):
        typos.add("".join(chars[:i] + [chars[i]] + chars[i:]))

    # 5. Reversal
    typos.add(token[::-1])

    # 6. Visual mutations (m -> rn, etc)
    if 'm' in token: typos.add(token.replace('m', 'rn'))
    if 'rn' in token: typos.add(token.replace('rn', 'm'))

    return typos

def generate_permutations(tokens: List[str], max_len: int = 3) -> Set[str]:
    """Generate token combinations and case variations"""
    perms = set()
    base_tokens = []
    for t in tokens:
        # Word-level mutations if it's a potential mnemonic fragment
        if " " in t:
            words = t.split()
            if len(words) <= 4:
                for combo in itertools.permutations(words):
                    perms.add(" ".join(combo))

        base_tokens.extend([t, t.lower(), t.upper(), t.capitalize()])

    base_tokens = list(set(base_tokens))
    for length in range(1, min(len(base_tokens), max_len) + 1):
        for combo in itertools.permutations(base_tokens, length):
            perms.add(" ".join(combo))
            perms.add("".join(combo))
    return perms

def check_candidate(pwd: str, targets: Set[str], exhaustive: bool, passphrase: str = "") -> List[Dict]:
    """Check a single password/token candidate against all derivation logic"""
    matches = []
    if not pwd: return matches

    # 1. As mnemonic
    norm_pwd = " ".join(pwd.lower().split())
    is_mnemonic = False
    try:
        is_mnemonic = Bip39MnemonicValidator().IsValid(norm_pwd)
    except Exception: pass

    if is_mnemonic:
        try:
            seed = Bip39SeedGenerator(norm_pwd).Generate(passphrase)
            for coin_cls, coin_type in [(Bip44, Bip44Coins.BITCOIN), (Bip49, Bip49Coins.BITCOIN), (Bip84, Bip84Coins.BITCOIN), (Bip86, Bip86Coins.BITCOIN)]:
                max_accounts = 5 if exhaustive else 1
                max_indices = 100 if exhaustive else 20
                for acc_idx in range(max_accounts):
                    acc_ctx = coin_cls.FromSeed(seed, coin_type).Purpose().Coin().Account(acc_idx)
                    for i in range(max_indices):
                        for chain in [Bip44Changes.CHAIN_EXT, Bip44Changes.CHAIN_INT]:
                            try:
                                addr = acc_ctx.Change(chain).AddressIndex(i).PublicKey().ToAddress()
                                if addr in targets:
                                    matches.append({
                                        "type": "mnemonic", "value": norm_pwd, "address": addr,
                                        "path_index": i, "account": acc_idx,
                                        "chain": "external" if chain == Bip44Changes.CHAIN_EXT else "internal",
                                        "passphrase": passphrase
                                    })
                            except Exception: pass

            # 1b. Deep Discovery (Non-standard / Legacy Shards)
            if exhaustive:
                deep_paths = [
                    ("m/0'/0", Bip44Coins.BITCOIN), # MultiBit / BRD / Original BIP32
                    ("m/0", Bip44Coins.BITCOIN),    # Old Electrum
                    ("m/45'/0", Bip44Coins.BITCOIN), # BIP-45 Multisig Shard
                    ("m/48'/0'/0'/1'", Bip44Coins.BITCOIN), # BIP-48 Nested SegWit
                    ("m/48'/0'/0'/2'", Bip44Coins.BITCOIN), # BIP-48 Native SegWit
                    ("m/47'/0'/0'", Bip44Coins.BITCOIN),    # BIP-47 Payment Codes
                    ("m/44'/145'/0'", Bip44Coins.BITCOIN_CASH), # BCH Fork
                    ("m/44'/236'/0'", Bip44Coins.BITCOIN_SV),   # BSV Fork
                    ("m/44'/156'/0'", Bip44Coins.BITCOIN_GOLD), # BTG Fork
                    ("m/44'/0'/0'", Bip44Coins.BITCOIN), # Standard P2PKH Account 0
                    ("m/44'/0'/1'", Bip44Coins.BITCOIN), # Standard P2PKH Account 1 (Blockchain.com style)
                ]

                for path_prefix, coin_type in deep_paths:
                    try:
                        # Use Bip32 context for raw path derivation
                        bip32_ctx = Bip32Secp256k1.FromSeedAndPath(seed, path_prefix)
                        # Check first 50 indices for "Sovereign Discovery"
                        for i in range(50):
                            try:
                                child = bip32_ctx.ChildKey(i)
                                # Derive common address formats for each custom shard
                                pub_key = child.PublicKey()
                                addresses = [
                                    pub_key.ToAddress(), # Default P2PKH
                                ]
                                # If it's a Bitcoin-type path, also try SegWit and Taproot formats
                                if coin_type == Bip44Coins.BITCOIN:
                                    priv_bytes = child.PrivateKey().Raw().ToBytes()
                                    try:
                                        addresses.append(Bip49.FromPrivateKey(priv_bytes, Bip49Coins.BITCOIN).PublicKey().ToAddress())
                                    except: pass
                                    try:
                                        addresses.append(Bip84.FromPrivateKey(priv_bytes, Bip84Coins.BITCOIN).PublicKey().ToAddress())
                                    except: pass
                                    try:
                                        addresses.append(Bip86.FromPrivateKey(priv_bytes, Bip86Coins.BITCOIN).PublicKey().ToAddress())
                                    except: pass

                                for addr in addresses:
                                    if addr in targets:
                                        matches.append({
                                            "type": "mnemonic_deep", "value": norm_pwd, "address": addr,
                                            "path": f"{path_prefix}/{i}", "passphrase": passphrase,
                                            "priority": "DEEP_DISCOVERY"
                                        })
                            except Exception: pass
                    except Exception: pass
        except Exception: pass

    # 2. As raw hex key (Brainwallet or Raw)
    potential_keys = []
    if len(pwd) == 64 and all(c in "0123456789abcdefABCDEF" for c in pwd):
        potential_keys.append(pwd)

    # Brainwallet SHA256
    potential_keys.append(hashlib.sha256(pwd.encode()).hexdigest())

    for k in potential_keys:
        res = btc_from_hex(k)
        if res:
            for addr in res['addresses'].values():
                if addr in targets:
                    matches.append({"type": "private_key", "value": pwd, "address": addr, "hex": k})

    # 3. As WIF
    res_wif = btc_from_wif(pwd)
    if res_wif:
        for addr in res_wif['addresses'].values():
            if addr in targets:
                matches.append({"type": "wif", "value": pwd, "address": addr})

    return matches

def run_btcrecover_scan(
    wallet_file: str = None,
    passwords: List[str] = None,
    tokenlist: List[str] = None,
    target_addresses: List[str] = None,
    exhaustive: bool = False,
    workers: int = 4
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
            deep_tokens = set()
            for token in tokenlist:
                # If it looks like a whole mnemonic, don't generate per-character typos for the whole string
                if len(token.split()) > 3:
                    deep_tokens.add(token)
                    # Mutation at word level could be added here if needed
                else:
                    deep_tokens.update(generate_typos(token))
            candidates.update(deep_tokens)
            candidates.update(generate_permutations(list(candidates), max_len=3))
        else:
            # Simple permutations
            candidates.update(tokenlist)
            candidates.update(generate_permutations(tokenlist, max_len=2))

    results["attempts"] = len(candidates)

    # Process candidates in parallel for "bulletproof" speed
    if exhaustive and len(candidates) > 5:
        # For exhaustive, we also try cross-pollinating tokens as passphrases for mnemonics
        passphrases = [""]
        if exhaustive:
            # Add top 5 candidates as potential passphrases to avoid explosion but catch common ones
            passphrases.extend(list(candidates)[:5])

        with ProcessPoolExecutor(max_workers=workers) as executor:
            all_futures = []
            for pwd in candidates:
                for pp in passphrases:
                    # Skip if password is same as passphrase (unless empty)
                    if pp and pwd == pp: continue
                    all_futures.append(executor.submit(check_candidate, pwd, targets, exhaustive, pp))

            for future in all_futures:
                found_matches = future.result()
                if found_matches:
                    results["found"] = True
                    results["matches"].extend(found_matches)
    else:
        for pwd in candidates:
            found_matches = check_candidate(pwd, targets, exhaustive)
            if found_matches:
                results["found"] = True
                results["matches"].extend(found_matches)
            if results["found"] and not exhaustive:
                break

    return results
