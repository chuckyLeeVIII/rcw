import pytest
from guardian.subagents.btc_recover import btc_from_hex, generate_typos, btc_from_wif, check_candidate

def test_btc_from_hex_valid():
    # Known key: 0x1
    hex_key = "0000000000000000000000000000000000000000000000000000000000000001"
    res = btc_from_hex(hex_key)
    assert res is not None
    # bip-utils derived P2PKH for 0x1 is 1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH
    assert res['btc_p2pkh'] == "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
    assert res['btc_p2wpkh'].startswith("bc1q")
    assert res['btc_p2sh_p2wpkh'].startswith("3")

def test_btc_from_hex_invalid():
    assert btc_from_hex("not_hex") is None
    assert btc_from_hex("123") is None

def test_btc_from_wif():
    # WIF for 0x1 uncompressed
    wif_uncomp = "5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf"
    res = btc_from_wif(wif_uncomp)
    assert res is not None
    assert res['private_key_hex'] == "0000000000000000000000000000000000000000000000000000000000000001"

def test_generate_typos():
    token = "test"
    typos = generate_typos(token)
    assert token in typos
    # Omission: 'est', 'tst', 'tet', 'tes'
    assert "est" in typos
    # Swaps: 'etst', 'tset', 'tets'
    assert "tset" in typos
    # Substitution: 't3st' (e -> 3)
    assert "t3st" in typos

def test_exhaustive_derivation():
    # Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    # BTC (BIP44) m/44'/0'/0'/0/0 -> 1JQH7moZMR4o3Yv4YmsmZ7SST7Nf6Gxy6a
    # LTC (BIP44) m/44'/2'/0'/0/0 -> LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    targets = {"LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez"}

    # Non-exhaustive should fail for LTC
    res1 = check_candidate(mnemonic, targets, exhaustive=False)
    assert len(res1) == 0

    # Exhaustive should find LTC
    res2 = check_candidate(mnemonic, targets, exhaustive=True)
    assert len(res2) > 0
    assert any(m['address'] == "LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez" for m in res2)


# ---- Tests for changes introduced in this PR ----

def test_generate_typos_no_padding():
    """Verify padding variants were removed from generate_typos"""
    token = "test"
    typos = generate_typos(token)
    # Padding prefixes/suffixes should NOT be generated
    assert "!test" not in typos
    assert "test!" not in typos
    assert "!test!" not in typos
    assert "1test" not in typos
    assert "test1" not in typos
    assert "test123" not in typos
    assert "?test?" not in typos
    assert "_test" not in typos
    assert "test_" not in typos
    assert "*test*" not in typos


def test_generate_typos_no_per_char_casing():
    """Verify per-character casing permutations were removed from generate_typos"""
    token = "test"
    typos = generate_typos(token)
    # Per-char casing permutations should NOT be generated (e.g., "TEST", "TeSt", "tEsT")
    assert "TEST" not in typos
    assert "TeSt" not in typos
    assert "tEsT" not in typos
    assert "TeST" not in typos


def test_generate_typos_no_nm_substitution():
    """Verify n<->m substitution was removed from generate_typos"""
    token = "man"
    typos = generate_typos(token)
    # 'm' -> 'n' substitution should NOT be present
    assert "nan" not in typos
    token2 = "note"
    typos2 = generate_typos(token2)
    # 'n' -> 'm' substitution should NOT be present
    assert "mote" not in typos2


def test_generate_typos_no_vv_w_mutation():
    """Verify vv<->w visual mutation was removed from generate_typos"""
    token = "award"
    typos = generate_typos(token)
    # 'w' -> 'vv' should NOT be generated
    assert "avvard" not in typos

    token2 = "avvoid"
    typos2 = generate_typos(token2)
    # 'vv' -> 'w' should NOT be generated
    assert "awoid" not in typos2


def test_generate_typos_still_has_core_mutations():
    """Verify core mutations still work after PR removals"""
    token = "test"
    typos = generate_typos(token)
    # Original token is always included
    assert "test" in typos
    # Omissions still work
    assert "est" in typos
    assert "tst" in typos
    assert "tet" in typos
    assert "tes" in typos
    # Adjacent swaps still work
    assert "etst" in typos
    assert "tset" in typos
    # Substitutions still work: e->3
    assert "t3st" in typos
    # Visual mutation m->rn still works
    token_m = "man"
    typos_m = generate_typos(token_m)
    assert "rnan" in typos_m


def test_generate_typos_v_u_substitution_retained():
    """Verify v<->u substitution still works (not removed)"""
    token = "value"
    typos = generate_typos(token)
    # 'v' -> 'u' substitution should still be present
    assert "ualue" in typos
    token2 = "user"
    typos2 = generate_typos(token2)
    # 'u' -> 'v' substitution should still be present
    assert "vser" in typos2


def test_generate_typos_reversal_retained():
    """Verify reversal still works after PR removals"""
    token = "hello"
    typos = generate_typos(token)
    assert "olleh" in typos


def test_check_candidate_no_ethereum_in_exhaustive():
    """Verify Ethereum is NOT found even in exhaustive mode (removed from multi-coin)"""
    # ETH address for "abandon x12 about" mnemonic at m/44'/60'/0'/0/0
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    eth_address = "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"
    targets = {eth_address}

    # Exhaustive mode should NOT find ETH address since Ethereum was removed
    res = check_candidate(mnemonic, targets, exhaustive=True)
    assert not any(m['address'] == eth_address for m in res)


def test_check_candidate_btc_still_found_exhaustive():
    """Verify BTC is still found in exhaustive mode after PR changes"""
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    # BTC standard address for m/44'/0'/0'/0/0
    btc_address = "1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA"
    targets = {btc_address}

    res = check_candidate(mnemonic, targets, exhaustive=True)
    assert len(res) > 0
    assert any(m['address'] == btc_address for m in res)


def test_check_candidate_no_multi_coin_hex():
    """Verify multi-coin hex private key check was removed (only BTC should be checked)"""
    # Private key 0x1 - its ETH address is 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf
    # but we no longer check ETH via hex key
    hex_key = "0000000000000000000000000000000000000000000000000000000000000001"
    eth_address = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"
    targets = {eth_address}

    # Even exhaustive mode should not match ETH address from hex key
    res = check_candidate(hex_key, targets, exhaustive=True)
    assert not any(m.get('address') == eth_address for m in res)


def test_check_candidate_btc_from_hex_still_works():
    """Verify BTC address matching from hex key still works after PR changes"""
    hex_key = "0000000000000000000000000000000000000000000000000000000000000001"
    # P2PKH address for private key 0x1
    btc_address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
    targets = {btc_address}

    res = check_candidate(hex_key, targets, exhaustive=False)
    assert len(res) > 0
    assert any(m['address'] == btc_address for m in res)


def test_check_candidate_wif_btc_still_works():
    """Verify BTC address matching from WIF still works after PR changes"""
    # WIF for private key 0x1 (uncompressed)
    wif = "5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf"
    btc_address = "1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"
    targets = {btc_address}

    res = check_candidate(wif, targets, exhaustive=False)
    assert len(res) > 0
    assert any(m['type'] == 'wif' for m in res)


def test_check_candidate_empty_input():
    """Verify empty input returns empty matches"""
    res = check_candidate("", {"1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH"}, exhaustive=False)
    assert res == []


def test_generate_typos_empty_string():
    """Verify generate_typos handles empty string gracefully"""
    typos = generate_typos("")
    assert "" in typos


def test_generate_typos_single_char():
    """Verify generate_typos handles single character tokens"""
    typos = generate_typos("a")
    assert "a" in typos
    # Substitution: a -> 4 (leet), a -> @ (special)
    assert "4" in typos
    assert "@" in typos
