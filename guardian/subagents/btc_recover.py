import hashlib
import itertools
from concurrent.futures import ProcessPoolExecutor
from typing import Dict, Optional, List, Set
from bip_utils import (
    Bip44, Bip44Coins, Bip49, Bip49Coins, Bip84, Bip84Coins, Bip86, Bip86Coins,
    WifDecoder, WifEncoder, WifPubKeyModes, Bip39MnemonicValidator, Bip39SeedGenerator,
    P2PKHAddr, P2WPKHAddr, P2SHAddr, Bip32Secp256k1, Bip44ConfGetter, Bip84ConfGetter, Bip44Changes, Bip32KeyError,
    ElectrumV1MnemonicValidator, ElectrumV1SeedGenerator,
    ElectrumV2MnemonicValidator, ElectrumV2SeedGenerator, ElectrumV2MnemonicTypes
)
from bip_utils.bip.bip39.bip39_mnemonic_utils import Bip39Languages

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
    """
    [DeepTools Engine]
    Generate character-level mutations for a token
    """
    typos = {token}

    # If it looks like a sentence (multi-word), try word-level mutations
    if " " in token:
        words = token.split()
        if len(words) <= 24:
            # 1. Phonetic/Common Word Substitutions
            subs_map = {
                'aboot': 'about', 'abandonn': 'abandon', 'seeeed': 'seed',
                'pass': 'password', 'key': 'private', 'secret': 'secret'
            }
            for i, w in enumerate(words):
                wl = w.lower()
                if wl in subs_map:
                    w2 = words[:]
                    w2[i] = subs_map[wl]
                    typos.add(" ".join(w2))

            # 2. Try single-word character typos for each word if sentence is not too long
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
                    # Common substitutions
                    keyboard_adj = {'o': '0p', 'i': '1u', 'a': 'sq', 's': 'ad', 'e': '3r'}
                    for j, c in enumerate(w):
                        cl = c.lower()
                        if cl in keyboard_adj:
                            for adj in keyboard_adj[cl]:
                                w2 = words[:]
                                chars_w = list(w)
                                chars_w[j] = adj
                                w2[i] = "".join(chars_w)
                                typos.add(" ".join(w2))
        return typos

    chars = list(token)

    # 1. Omissions (Single character deletion)
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

    # 3. Exhaustive Substitutions & Keyboard Proximity (DeepTools v2)
    # Using list of dicts to handle multiple substitutions per character
    # Keys should be lowercase to match cl
    subs_list = [
        {'o': '0'}, {'0': 'o'}, {'i': '1'}, {'1': 'i'}, {'l': '1'}, {'e': '3'}, {'3': 'e'},
        {'a': '4'}, {'4': 'a'}, {'s': '5'}, {'5': 's'}, {'t': '7'}, {'7': 't'},
        {'g': '9'}, {'9': 'g'}, {'z': '2'}, {'2': 'z'}, {'b': '8'}, {'8': 'b'},
        {'i': 'l'}, {'l': 'i'}, {'i': 'I'}, {'l': 'I'},
        {'s': '$'}, {'a': '@'}, {'i': '!'}, {'e': '€'}, {'b': '6'}, {'f': 'ph'},
        {'v': 'u'}, {'u': 'v'}, {'n': 'm'}, {'m': 'n'}, {'ph': 'f'}, {'ck': 'k'},
        {'k': 'ck'}, {'sh': 'sch'}, {'sch': 'sh'}, {'y': 'ie'}, {'ie': 'y'},
        {'g': '6'}, {'6': 'g'}, {'o': 'O'}
    ]

    keyboard_adj = {
        'q': 'wa', 'w': 'qeas', 'e': 'wrsd', 'r': 'etdf', 't': 'ryfg', 'y': 'tugh', 'u': 'yijh', 'i': 'uokj', 'o': 'iplk', 'p': 'ol',
        'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv', 'h': 'gyujnb', 'j': 'hukmnb', 'k': 'jilm', 'l': 'kop',
        'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn', 'n': 'bhjm', 'm': 'njk'
    }

    for i, c in enumerate(chars):
        cl = c.lower()
        # Subs
        for subs in subs_list:
            if cl in subs:
                c2 = chars[:]
                c2[i] = subs[cl]
                typos.add("".join(c2))
        # Keyboard adjacent
        if cl in keyboard_adj:
            for adj in keyboard_adj[cl]:
                c2 = chars[:]
                c2[i] = adj
                typos.add("".join(c2))

    # 4. Insertions (duplicate characters & padding)
    for i in range(len(chars)):
        # Double character
        typos.add("".join(chars[:i] + [chars[i]] + chars[i:]))
        # Nearby insertions
        if i < len(chars) - 1:
            typos.add("".join(chars[:i+1] + [chars[i]] + chars[i+1:]))

    # 5. Reversal
    typos.add(token[::-1])

    # 7. Visual mutations (m -> rn, cl -> d, etc)
    if 'm' in token: typos.add(token.replace('m', 'rn'))
    if 'rn' in token: typos.add(token.replace('rn', 'm'))
    if 'vv' in token: typos.add(token.replace('vv', 'w'))
    if 'w' in token: typos.add(token.replace('w', 'vv'))
    if 'cl' in token: typos.add(token.replace('cl', 'd'))
    if 'd' in token: typos.add(token.replace('d', 'cl'))
    if 'o' in token: typos.add(token.replace('o', '0'))
    if '0' in token: typos.add(token.replace('0', 'o'))
    if 'l' in token: typos.add(token.replace('l', '1'))
    if '1' in token: typos.add(token.replace('1', 'l'))
    if 'I' in token: typos.add(token.replace('I', 'l'))
    if 'l' in token: typos.add(token.replace('l', 'I'))
    if 'I' in token: typos.add(token.replace('I', '1'))
    if '1' in token: typos.add(token.replace('1', 'I'))

    # 7. Character-level casing (for short tokens)
    if len(token) <= 12:
        for i in range(len(chars)):
            c2 = chars[:]
            c2[i] = c2[i].swapcase()
            typos.add("".join(c2))

    # 8. Per-character casing permutations (only for very short strings to avoid explosion)
    if len(token) <= 7:
        for combo in itertools.product(*[(c.lower(), c.upper()) for c in token]):
            typos.add("".join(combo))

    # 9. Exhaustive padding variations
    paddings = ["!", "1", "123", "0", "_", "-", "@", "*", "$", ".", " ", "?", "#"]
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

def fix_mnemonic_words(mnemonic: str, lang: Bip39Languages) -> Set[str]:
    """[DeepTools] Try to fix a single invalid word in a mnemonic"""
    words = mnemonic.lower().split()
    if len(words) not in (12, 15, 18, 21, 24):
        return {mnemonic}

    from bip_utils.bip.bip39.bip39_mnemonic_utils import Bip39WordsListGetter
    words_list = Bip39WordsListGetter.Instance().GetByLanguage(lang)

    invalid_indices = []
    for i, w in enumerate(words):
        try:
            words_list.GetWordIdx(w)
        except ValueError:
            invalid_indices.append(i)

    # If only one word is invalid, try replacing it with words that have small distance
    if len(invalid_indices) == 1:
        idx = invalid_indices[0]
        bad_word = words[idx]
        candidates = {mnemonic}

        for i in range(words_list.Length()):
            vw = words_list.GetWordAtIdx(i)
            # Simple heuristic: same first 3 letters or very similar length
            if vw.startswith(bad_word[:3]) or (len(vw) == len(bad_word) and len(set(vw) & set(bad_word)) >= len(vw)-1):
                new_words = words[:]
                new_words[idx] = vw
                candidates.add(" ".join(new_words))

        return candidates

    return {mnemonic}

def check_candidate(pwd: str, targets: Set[str], exhaustive: bool, passphrase: str = "") -> List[Dict]:
    """
    [DeepTools Engine]
    Check a single password/token candidate against all derivation logic
    """
    matches = []
    if not pwd: return matches

    # Normalize mnemonic
    norm_pwd = " ".join(pwd.lower().split())

    # 1. As BIP-39 mnemonic
    languages = [Bip39Languages.ENGLISH]
    if exhaustive:
        languages = [Bip39Languages.ENGLISH, Bip39Languages.SPANISH, Bip39Languages.FRENCH, Bip39Languages.ITALIAN]

    for lang in languages:
        candidates = {norm_pwd}
        if exhaustive:
            candidates.update(fix_mnemonic_words(norm_pwd, lang))

        for cand in candidates:
            is_mnemonic = False
            try:
                validator = Bip39MnemonicValidator(lang)
                is_mnemonic = validator.IsValid(cand)
            except Exception: pass

            if not is_mnemonic: continue

            try:
                seed = Bip39SeedGenerator(cand).Generate(passphrase)

                # Standard BIP paths for BTC
                btc_variants = [
            (Bip84, Bip84Coins.BITCOIN), (Bip86, Bip86Coins.BITCOIN),
            (Bip44, Bip44Coins.BITCOIN), (Bip49, Bip49Coins.BITCOIN)
                ]

                # Multi-coin support for exhaustive mode
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
                        # Pre-calculate config parameters safely
                        p2pkh_net_ver = None
                        bech32_hrp = None
                        try:
                            conf_44 = Bip44ConfGetter.GetConfig(coin_type)
                            p2pkh_net_ver = conf_44.AddrParams().get('net_ver')
                        except: pass
                        try:
                            conf_84 = Bip84ConfGetter.GetConfig(coin_type)
                            bech32_hrp = conf_84.AddrParams().get('hrp')
                        except: pass

                        # Account derivation
                        acc_ctx_base = coin_cls.FromSeed(seed, coin_type).Purpose().Coin()

                        for acc_idx in range(max_accounts):
                            acc_ctx = acc_ctx_base.Account(acc_idx)
                            for i in range(max_indices):
                                for chain in [Bip44Changes.CHAIN_EXT, Bip44Changes.CHAIN_INT]:
                                    try:
                                        node = acc_ctx.Change(chain).AddressIndex(i)
                                        pub_key = node.PublicKey()
                                        pub_bytes = pub_key.RawCompressed().ToBytes()

                                        check_addresses = []
                                        # Standard address for the specific BIP context
                                        check_addresses.append((pub_key.ToAddress(), "standard"))

                                        if exhaustive:
                                            # Legacy (P2PKH)
                                            if p2pkh_net_ver:
                                                try:
                                                    p2pkh = P2PKHAddr.EncodeKey(pub_bytes, net_ver=p2pkh_net_ver)
                                                    check_addresses.append((p2pkh, "p2pkh"))
                                                except: pass

                                            # SegWit (P2WPKH)
                                            if bech32_hrp:
                                                try:
                                                    p2wpkh = P2WPKHAddr.EncodeKey(pub_bytes, hrp=bech32_hrp)
                                                    check_addresses.append((p2wpkh, "p2wpkh"))
                                                except: pass

                                            # Nested SegWit (P2SH-P2WPKH)
                                            try:
                                                p2sh_p2wpkh = Bip49.FromPublicKey(pub_bytes, coin_type).PublicKey().ToAddress()
                                                check_addresses.append((p2sh_p2wpkh, "p2sh-p2wpkh"))
                                            except: pass

                                        for addr, fmt in check_addresses:
                                            if addr in targets:
                                                matches.append({
                                                    "type": "mnemonic", "value": cand, "address": addr,
                                                    "format": fmt,
                                                    "coin": coin_type.name if hasattr(coin_type, 'name') else str(coin_type), "path_index": i, "account": acc_idx,
                                                    "chain": "external" if chain == Bip44Changes.CHAIN_EXT else "internal",
                                                    "passphrase": passphrase
                                                })
                                    except Exception: pass
                    except Exception: pass

                # Deep search extra paths (Electrum, MultiBit, BIP-45, BIP-48, etc.)
                if exhaustive:
                    try:
                        # In exhaustive mode, we check extra paths for major coins
                        extra_coins = [
                            (Bip44Coins.BITCOIN, "btc"),
                            (Bip44Coins.LITECOIN, "ltc"),
                            (Bip44Coins.DOGECOIN, "doge"),
                        ]

                        root_ctx = Bip32Secp256k1.FromSeed(seed)
                        # Expanded paths for deep discovery
                        extra_paths = [
                            # m/0/n (Electrum Standard)
                            "m/0/{}", "m/0/0/{}",
                            # m/0'/0/n (BIP-32 Legacy)
                            "m/0'/0/{}", "m/0'/0/0/{}",
                            # BIP-44 Fork/Legacy variants
                            "m/44'/0'/0'/0/{}", "m/44'/0'/0'/{}", "m/44'/0'/1'/0/{}",
                            # BIP-45 (Multisig)
                            "m/45'/0/{}", "m/45'/0/0/{}",
                            # BIP-48 (Multisig) - m/48'/coin'/account'/script'/change/index
                            "m/48'/0'/0'/1'/0/{}", "m/48'/0'/0'/2'/0/{}",
                            # Blockchain.info Legacy
                            "m/0'/{}",
                            # Copay / BitPay
                            "m/0'/0/{}",
                            # BIP-47 Payment Codes
                            "m/47'/0'/0'/0/{}",
                            # BIP-141 (Multi-sig/SegWit variants)
                            "m/141'/0'/0'/0/{}",
                        ]

                        for coin_type, coin_name in extra_coins:
                            try:
                                conf = Bip44ConfGetter.GetConfig(coin_type)
                                net_ver = conf.AddrParams().get('net_ver')
                                try:
                                    hrp = Bip84ConfGetter.GetConfig(coin_type).AddrParams().get('hrp')
                                except Exception: hrp = None

                                for path_template in extra_paths:
                                    for i in range(max_indices):
                                        try:
                                            path = path_template.format(i)
                                            node = root_ctx.DerivePath(path)
                                            pub_key = node.PublicKey()
                                            pub_bytes = pub_key.RawCompressed().ToBytes()

                                            check_addresses = []
                                            # Legacy (P2PKH)
                                            if net_ver:
                                                try:
                                                    p2pkh = P2PKHAddr.EncodeKey(pub_bytes, net_ver=net_ver)
                                                    check_addresses.append((p2pkh, "p2pkh"))
                                                except Exception: pass

                                            # SegWit (P2WPKH)
                                            if hrp:
                                                try:
                                                    p2wpkh = P2WPKHAddr.EncodeKey(pub_bytes, hrp=hrp)
                                                    check_addresses.append((p2wpkh, "p2wpkh"))
                                                except Exception: pass

                                            # Nested SegWit (P2SH-P2WPKH)
                                            try:
                                                # Fallback to matching Bip49Coins if possible
                                                p2sh_coin = coin_type
                                                if coin_type == Bip44Coins.BITCOIN: p2sh_coin = Bip49Coins.BITCOIN
                                                elif coin_type == Bip44Coins.LITECOIN: p2sh_coin = Bip49Coins.LITECOIN

                                                p2sh_p2wpkh = Bip49.FromPublicKey(pub_bytes, p2sh_coin).PublicKey().ToAddress()
                                                check_addresses.append((p2sh_p2wpkh, "p2sh-p2wpkh"))
                                            except Exception: pass

                                            for addr, fmt in check_addresses:
                                                if addr in targets:
                                                    matches.append({
                                                        "type": "mnemonic_extra_path", "value": cand, "address": addr,
                                                        "format": fmt, "coin": coin_name,
                                                        "path": path, "passphrase": passphrase
                                                    })
                                        except Exception: pass
                            except Exception: pass
                    except Exception: pass
            except Exception: pass

    # 1.5. As Electrum Mnemonic
    electrum_versions = [
        (ElectrumV1MnemonicValidator, ElectrumV1SeedGenerator, "electrum_v1"),
        (lambda: ElectrumV2MnemonicValidator(ElectrumV2MnemonicTypes.STANDARD), ElectrumV2SeedGenerator, "electrum_v2_standard"),
        (lambda: ElectrumV2MnemonicValidator(ElectrumV2MnemonicTypes.SEGWIT), ElectrumV2SeedGenerator, "electrum_v2_segwit")
    ]

    for validator_factory, seed_gen_cls, e_type in electrum_versions:
        try:
            validator = validator_factory()
            if validator.IsValid(norm_pwd):
                seed = seed_gen_cls(norm_pwd).Generate(passphrase)
                root_ctx = Bip32Secp256k1.FromSeed(seed)

                # Electrum default paths (Standard and SegWit use same external/internal path scheme)
                e_paths = ["m/0/{}", "m/1/{}"]

                # For Electrum V2 SegWit, it uses different address encoding
                for path_template in e_paths:
                    for i in range(20):
                        try:
                            path = path_template.format(i)
                            node = root_ctx.DerivePath(path)
                            pub_key = node.PublicKey()

                            check_addresses = []
                            if e_type == "electrum_v2_segwit":
                                # Electrum V2 SegWit uses P2WPKH
                                check_addresses.append((P2WPKHAddr.EncodeKey(pub_key.RawCompressed().ToBytes(), hrp="bc"), "p2wpkh"))
                            else:
                                # Electrum V1 and V2 Standard use P2PKH
                                check_addresses.append((P2PKHAddr.EncodeKey(pub_key.RawCompressed().ToBytes(), net_ver=b'\x00'), "p2pkh"))

                            for addr, fmt in check_addresses:
                                if addr in targets:
                                    matches.append({
                                        "type": e_type, "value": norm_pwd, "address": addr,
                                        "format": fmt, "path": path, "passphrase": passphrase
                                    })
                        except: pass
        except: pass


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

        if exhaustive:
            # Multi-coin hex check
            try:
                priv_bytes = bytes.fromhex(k)
                other_coins = [
                    (Bip44Coins.ETHEREUM, "eth"),
                    (Bip44Coins.ETHEREUM_CLASSIC, "etc"),
                    (Bip44Coins.LITECOIN, "ltc"),
                    (Bip44Coins.DOGECOIN, "doge"),
                    (Bip44Coins.DASH, "dash"),
                    (Bip44Coins.BITCOIN_CASH, "bch")
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
            # Multi-coin WIF check
            try:
                priv_bytes = bytes.fromhex(res_wif['private_key_hex'])
                other_coins = [
                    (Bip44Coins.ETHEREUM, "eth"),
                    (Bip44Coins.ETHEREUM_CLASSIC, "etc"),
                    (Bip44Coins.LITECOIN, "ltc"),
                    (Bip44Coins.DOGECOIN, "doge"),
                    (Bip44Coins.DASH, "dash"),
                    (Bip44Coins.BITCOIN_CASH, "bch")
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
    """
    [DeepTools Engine]
    Exhaustive BTC recovery logic.
    """
    if exhaustive:
        print(f"[DeepTools] Initializing exhaustive search with {workers} workers...")

    results = {"found": False, "attempts": 0, "matches": []}
    targets = set(target_addresses or [])

    if not targets:
        return results

    candidates = set(passwords or [])

    if tokenlist:
        if exhaustive:
            # Deep search with typos and permutations
            # To avoid explosion, we typo-mutate individual tokens AND original tokens,
            # then permute the original tokens.
            base_typos = set()
            for token in tokenlist:
                if len(token.split()) > 3:
                    base_typos.add(token)
                else:
                    base_typos.update(generate_typos(token))

            candidates.update(base_typos)

            # Permute original tokens (limit to max_len=3 to avoid explosion)
            perms = generate_permutations(tokenlist, max_len=min(3, len(tokenlist)))
            candidates.update(perms)

            # Optionally add some typos for the best permutations if count is low
            if len(candidates) < 500:
                for p in sorted(perms)[:50]:
                    if " " not in p: # only typo-mutate single-word perms
                        candidates.update(generate_typos(p))
        else:
            # Simple permutations
            candidates.update(tokenlist)
            candidates.update(generate_permutations(tokenlist, max_len=2))

    results["attempts"] = len(candidates)

    # Process candidates in parallel for "bulletproof" speed
    if exhaustive and len(candidates) > 5:
        print(f"[DeepTools Engine] Running exhaustive search on {len(candidates)} candidates...")

        # For exhaustive, we also try cross-pollinating tokens as passphrases for mnemonics
        passphrases = [""]
        if exhaustive:
            # DeepTools Engine: Exhaustive cross-pollination
            # Use original tokens and top candidates as potential passphrases
            pp_candidates = set(tokenlist or [])
            pp_candidates.update(list(candidates)[:20])
            passphrases.extend(list(pp_candidates))

        with ProcessPoolExecutor(max_workers=workers) as executor:
            all_futures = []
            for pwd in candidates:
                for pp in passphrases:
                    # Skip if password is same as passphrase (unless empty)
                    if pp and pwd == pp: continue
                    all_futures.append(executor.submit(check_candidate, pwd, targets, exhaustive, pp))

            for future in all_futures:
                try:
                    found_matches = future.result()
                    if found_matches:
                        results["found"] = True
                        results["matches"].extend(found_matches)
                except Exception as e:
                    print(f"DEBUG: worker error: {e}")
    else:
        if exhaustive:
            print(f"[DeepTools Engine] Running exhaustive search on {len(candidates)} candidates (Single-Threaded)...")
        for pwd in candidates:
            found_matches = check_candidate(pwd, targets, exhaustive)
            if found_matches:
                results["found"] = True
                results["matches"].extend(found_matches)
            if results["found"] and not exhaustive:
                break

    return results
