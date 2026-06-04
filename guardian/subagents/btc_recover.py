import hashlib
import itertools
import os
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, Optional, List, Set
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins, Bip86, Bip86Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, P2WPKHAddr, P2SHAddr, Bip32Secp256k1, Bip44ConfGetter, Bip84ConfGetter, Bip44Changes, Bip32KeyError
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
    """Generate character-level mutations for a token (DeepTools exhaustive)"""
    typos = {token}

    # If it looks like a sentence (multi-word), try word-level mutations
    if " " in token:
        words = token.split()
        if len(words) <= 24:
            # 1. Phonetic/Common Word Substitutions
            subs_map = {'aboot': 'about', 'abandonn': 'abandon', 'seeeed': 'seed'}
            for i, w in enumerate(words):
                if w.lower() in subs_map:
                    w2 = words[:]
                    w2[i] = subs_map[w.lower()]
                    typos.add(" ".join(w2))

            # 2. Try single-word character typos for each word
            if len(words) <= 12:
                for i, w in enumerate(words):
                    # Omissions
                    for j in range(len(w)):
                        w2 = words[:]
                        w2[i] = w[:j] + w[j+1:]
                        typos.add(" ".join(w2))
                    # Swaps
                    for j in range(len(w) - 1):
                        w2 = words[:]
                        chars_w = list(w)
                        chars_w[j], chars_w[j+1] = chars_w[j+1], chars_w[j]
                        w2[i] = "".join(chars_w)
                        typos.add(" ".join(w2))
        return typos

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
        {'s': '$', 'a': '@', 'i': '!', 'e': '€', 'b': '6', 'f': 'ph', 'v': 'u', 'u': 'v', 'n': 'm', 'm': 'n'}
    ]

    keyboard_adj = {
        'q': 'wa', 'w': 'qeas', 'e': 'wrsd', 'r': 'etdf', 't': 'ryfg', 'y': 'tugh', 'u': 'yijh', 'i': 'uokj', 'o': 'iplk', 'p': 'ol',
        'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv', 'h': 'gyujnb', 'j': 'hukmnb', 'k': 'jilm', 'l': 'kop',
        'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn', 'n': 'bhjm', 'm': 'njk'
    }

    for i, c in enumerate(chars):
        cl = c.lower()
        for subs in subs_list:
            if cl in subs:
                c2 = chars[:]
                c2[i] = subs[cl]
                typos.add("".join(c2))

        if cl in keyboard_adj:
            for adj in keyboard_adj[cl]:
                c2 = chars[:]
                c2[i] = adj
                typos.add("".join(c2))

    # 4. Insertions
    for i in range(len(chars)):
        typos.add("".join(chars[:i] + [chars[i]] + chars[i:]))

    # 5. Visual mutations
    if 'm' in token: typos.add(token.replace('m', 'rn'))
    if 'rn' in token: typos.add(token.replace('rn', 'm'))
    if 'vv' in token: typos.add(token.replace('vv', 'w'))
    if 'w' in token: typos.add(token.replace('w', 'vv'))

    # 6. Reversal
    typos.add(token[::-1])

    # 7. Casing
    if len(token) <= 10:
        typos.add(token.lower())
        typos.add(token.upper())
        typos.add(token.capitalize())
        for i in range(len(chars)):
            c2 = chars[:]
            c2[i] = c2[i].swapcase()
            typos.add("".join(c2))

    # 8. Padding
    paddings = ["!", "1", "123", "0", "_", "-", "@", "*", "$", ".", " "]
    for p in paddings:
        typos.add(p + token)
        typos.add(token + p)
        typos.add(p + token + p)

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

            # Standard BIP paths
            btc_variants = [
                (Bip84, Bip84Coins.BITCOIN), (Bip86, Bip86Coins.BITCOIN),
                (Bip44, Bip44Coins.BITCOIN), (Bip49, Bip49Coins.BITCOIN)
            ]

            if exhaustive:
                btc_variants.extend([
                    (Bip44, Bip44Coins.ETHEREUM), (Bip44, Bip44Coins.ETHEREUM_CLASSIC),
                    (Bip44, Bip44Coins.LITECOIN), (Bip49, Bip49Coins.LITECOIN), (Bip84, Bip84Coins.LITECOIN),
                    (Bip44, Bip44Coins.DOGECOIN), (Bip44, Bip44Coins.DASH), (Bip44, Bip44Coins.BITCOIN_CASH)
                ])

            max_accounts = 10 if exhaustive else 1
            max_indices = 150 if exhaustive else 20

            for coin_cls, coin_type in btc_variants:
                try:
                    conf = Bip44ConfGetter.GetConfig(coin_type)
                    net_ver = conf.AddrParams().get('net_ver')
                    hrp = conf.AddrParams().get('hrp')

                    for acc_idx in range(max_accounts):
                        acc_ctx = coin_cls.FromSeed(seed, coin_type).Purpose().Coin().Account(acc_idx)
                        for i in range(max_indices):
                            for chain in [Bip44Changes.CHAIN_EXT, Bip44Changes.CHAIN_INT]:
                                try:
                                    node = acc_ctx.Change(chain).AddressIndex(i)
                                    pub_key = node.PublicKey()
                                    addr = pub_key.ToAddress()
                                    if addr in targets:
                                        matches.append({
                                            "type": "mnemonic", "value": norm_pwd, "address": addr,
                                            "coin": coin_type.name, "path_index": i, "account": acc_idx,
                                            "passphrase": passphrase
                                        })
                                except Exception: pass
                except Exception: pass

            # Deep search extra paths
            if exhaustive:
                try:
                    extra_coins = [
                        (Bip44Coins.BITCOIN, "btc"),
                        (Bip44Coins.LITECOIN, "ltc"),
                        (Bip44Coins.DOGECOIN, "doge"),
                    ]
                    root_ctx = Bip32Secp256k1.FromSeed(seed)
                    extra_paths = [
                        "m/0/{}", "m/0/0/{}", "m/0'/0/{}", "m/0'/0/0/{}",
                        "m/44'/0'/0'/0/{}", "m/44'/0'/0'/{}", "m/44'/0'/1'/0/{}",
                        "m/45'/0/{}", "m/45'/0/0/{}",
                        "m/48'/0'/0'/1'/0/{}", "m/48'/0'/0'/2'/0/{}",
                        "m/0'/{}", "m/0'/0/{}"
                    ]

                    for coin_type, coin_name in extra_coins:
                        try:
                            conf = Bip44ConfGetter.GetConfig(coin_type)
                            net_ver = conf.AddrParams().get('net_ver')
                            try:
                                hrp = Bip84ConfGetter.GetConfig(coin_type).AddrParams().get('hrp')
                            except:
                                hrp = conf.AddrParams().get('hrp')

                            for path_template in extra_paths:
                                for i in range(max_indices):
                                    try:
                                        path = path_template.format(i)
                                        derived = root_ctx.DerivePath(path)
                                        pub_bytes = derived.PublicKey().RawCompressed().ToBytes()

                                        # P2PKH
                                        if net_ver is not None:
                                            addr = P2PKHAddr.EncodeKey(pub_bytes, net_ver=net_ver)
                                            if addr in targets:
                                                matches.append({"type": "mnemonic_extra", "value": norm_pwd, "address": addr, "path": path, "coin": coin_name, "script": "P2PKH"})

                                        # P2WPKH
                                        if hrp is not None:
                                            try:
                                                addr = P2WPKHAddr.EncodeKey(pub_bytes, hrp=hrp)
                                                if addr in targets:
                                                    matches.append({"type": "mnemonic_extra", "value": norm_pwd, "address": addr, "path": path, "coin": coin_name, "script": "P2WPKH"})
                                            except: pass
                                    except: pass
                        except: pass
                except Exception: pass
        except Exception: pass

    # 2. As raw hex key
    potential_keys = []
    if len(pwd) == 64 and all(c in "0123456789abcdefABCDEF" for c in pwd):
        potential_keys.append(pwd)
    potential_keys.append(hashlib.sha256(pwd.encode()).hexdigest())

    for k in potential_keys:
        res = btc_from_hex(k)
        if res:
            for addr in res['addresses'].values():
                if addr in targets:
                    matches.append({"type": "private_key", "value": pwd, "address": addr, "hex": k})

        if exhaustive:
            try:
                priv_bytes = bytes.fromhex(k)
                other_coins = [
                    (Bip44Coins.ETHEREUM, "eth"), (Bip44Coins.ETHEREUM_CLASSIC, "etc"),
                    (Bip44Coins.LITECOIN, "ltc"), (Bip44Coins.DOGECOIN, "doge"),
                    (Bip44Coins.DASH, "dash"), (Bip44Coins.BITCOIN_CASH, "bch")
                ]
                for coin_type, coin_name in other_coins:
                    try:
                        addr = Bip44.FromPrivateKey(priv_bytes, coin_type).PublicKey().ToAddress()
                        if addr in targets:
                            matches.append({"type": "private_key_multi", "value": pwd, "address": addr, "coin": coin_name, "hex": k})
                    except: pass
            except: pass

    # 3. As WIF
    res_wif = btc_from_wif(pwd)
    if res_wif:
        for addr in res_wif['addresses'].values():
            if addr in targets:
                matches.append({"type": "wif", "value": pwd, "address": addr})

        if exhaustive and 'private_key_hex' in res_wif:
            try:
                priv_bytes = bytes.fromhex(res_wif['private_key_hex'])
                other_coins = [
                    (Bip44Coins.ETHEREUM, "eth"), (Bip44Coins.ETHEREUM_CLASSIC, "etc"),
                    (Bip44Coins.LITECOIN, "ltc"), (Bip44Coins.DOGECOIN, "doge"),
                    (Bip44Coins.DASH, "dash"), (Bip44Coins.BITCOIN_CASH, "bch")
                ]
                for coin_type, coin_name in other_coins:
                    try:
                        addr = Bip44.FromPrivateKey(priv_bytes, coin_type).PublicKey().ToAddress()
                        if addr in targets:
                            matches.append({"type": "wif_multi", "value": pwd, "address": addr, "coin": coin_name})
                    except: pass
            except: pass

    return matches

def run_btcrecover_scan(
    wallet_file: str = None,
    passwords: List[str] = None,
    tokenlist: List[str] = None,
    target_addresses: List[str] = None,
    exhaustive: bool = False,
    workers: int = 4
) -> Dict:
    """Exhaustive BTC recovery logic."""
    results = {"found": False, "attempts": 0, "matches": []}
    targets = set(target_addresses or [])
    if not targets: return results

    candidates = set(passwords or [])
    if tokenlist:
        if exhaustive:
            base_typos = set()
            for token in tokenlist:
                if len(token.split()) > 3:
                    base_typos.add(token)
                else:
                    base_typos.update(generate_typos(token))
            candidates.update(base_typos)
            candidates.update(generate_permutations(tokenlist, max_len=min(3, len(tokenlist))))
        else:
            candidates.update(tokenlist)
            candidates.update(generate_permutations(tokenlist, max_len=2))

    results["attempts"] = len(candidates)

    if exhaustive and len(candidates) > 5:
        passphrases = [""]
        with ProcessPoolExecutor(max_workers=workers) as executor:
            all_futures = []
            for pwd in candidates:
                for pp in passphrases:
                    all_futures.append(executor.submit(check_candidate, pwd, targets, exhaustive, pp))
            for future in all_futures:
                try:
                    found_matches = future.result()
                    if found_matches:
                        results["found"] = True
                        results["matches"].extend(found_matches)
                except Exception: pass
    else:
        for pwd in candidates:
            found_matches = check_candidate(pwd, targets, exhaustive)
            if found_matches:
                results["found"] = True
                results["matches"].extend(found_matches)
            if results["found"] and not exhaustive: break

    return results
