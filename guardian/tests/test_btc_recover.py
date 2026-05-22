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
    # Casing (New)
    assert "TEST" in typos
    assert "TeSt" in typos
    # Padding (New)
    assert "!test" in typos
    assert "test123" in typos
    assert "?test?" in typos

def test_exhaustive_derivation():
    # Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    # BTC (BIP44) m/44'/0'/0'/0/0 -> 1JQH7moZMR4o3Yv4YmsmZ7SST7Nf6Gxy6a
    # LTC (BIP44) m/44'/2'/0'/0/0 -> LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez
    # ETH (BIP44) m/44'/60'/0'/0/0 -> 0x9858EfFD232B4033E47d90003D41EC34EcaEda94
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    targets = {"LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez", "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"}

    # Non-exhaustive should fail for LTC and ETH
    res1 = check_candidate(mnemonic, targets, exhaustive=False)
    assert len(res1) == 0

    # Exhaustive should find LTC and ETH
    res2 = check_candidate(mnemonic, targets, exhaustive=True)
    assert len(res2) >= 2
    found_addrs = {m['address'] for m in res2}
    assert "LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez" in found_addrs
    assert "0x9858EfFD232B4033E47d90003D41EC34EcaEda94" in found_addrs

def test_exhaustive_p2sh_p2wpkh():
    # Mnemonic abandon...about BTC m/49'/0'/0'/0/0 -> 37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    target = "37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf"

    # Standard check_candidate uses Bip49 for BTC anyway, but exhaustive checks ALL formats for ALL paths
    res = check_candidate(mnemonic, {target}, exhaustive=True)
    assert any(m['address'] == target for m in res)

def test_multi_coin_hex():
    # Private key 0x1 -> ETH address 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf
    hex_key = "0000000000000000000000000000000000000000000000000000000000000001"
    target_eth = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"

    # Non-exhaustive hex only checks BTC formats
    res1 = check_candidate(hex_key, {target_eth}, exhaustive=False)
    assert len(res1) == 0

    # Exhaustive hex checks multi-coin
    res2 = check_candidate(hex_key, {target_eth}, exhaustive=True)
    assert any(m['address'] == target_eth for m in res2)
