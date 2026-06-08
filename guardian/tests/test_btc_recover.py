import pytest
import os
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
    # Omission: 'est'
    assert "est" in typos
    # Swaps: 'tset'
    assert "tset" in typos
    # Substitution: 't3st' (e -> 3)
    assert "t3st" in typos
    # Keyboard Proximity: 't' -> 'r' -> 'rest'
    assert "rest" in typos
    # Padding
    assert "!test" in typos
    assert "test!" in typos
    assert "!test!" in typos
    # Casing
    assert "TEST" in typos

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

def test_generate_typos_visual_and_kb():
    """Verify visual mutations and keyboard proximity"""
    token = "man"
    typos = generate_typos(token)
    assert "nan" in typos  # n<->m
    assert "rnan" in typos # m->rn

    token_w = "award"
    typos_w = generate_typos(token_w)
    assert "avvard" in typos_w # w->vv

def test_check_candidate_multi_coin():
    """Verify multi-coin support in exhaustive mode"""
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    # ETH address for m/44'/60'/0'/0/0
    eth_address = "0x9858EfFD232B4033E47d90003D41EC34EcaEda94"
    # ETC address for m/44'/61'/0'/0/0
    etc_address = "0xFA22515E43658ce56A7682B801e9B5456f511420"

    targets = {eth_address, etc_address}
    res = check_candidate(mnemonic, targets, exhaustive=True)

    addresses_found = [m['address'] for m in res]
    assert eth_address in addresses_found
    assert etc_address in addresses_found

def test_check_candidate_hex_multi_coin():
    """Verify multi-coin hex private key check"""
    hex_key = "0000000000000000000000000000000000000000000000000000000000000001"
    eth_address = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"
    ltc_address = "LVuDpNCSSj6pQ7t9Pv6d6sUkLKoqDEVUnJ"
    targets = {eth_address, ltc_address}

    res = check_candidate(hex_key, targets, exhaustive=True)
    found_addresses = [m.get('address') for m in res]
    assert eth_address in found_addresses
    assert any(addr == ltc_address for addr in found_addresses)

def test_extra_path_discovery():
    """Verify Electrum-style extra path discovery (m/0/n) in exhaustive mode"""
    # Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    # Electrum path m/0/0 for BTC -> 16p7VpG7Y4VpkQZ8f6pS8E5pG7VpkQZ8f6 (Actually let's check what it really is)
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

    # We'll use a target we know should be hit by extra_paths loop
    # Let's pick a known path: m/0/0
    from bip_utils import Bip32Secp256k1, Bip39SeedGenerator, P2PKHAddr, Bip44ConfGetter, Bip44Coins
    seed = Bip39SeedGenerator(mnemonic).Generate()
    root = Bip32Secp256k1.FromSeed(seed)
    node = root.DerivePath("m/0/0")
    net_ver = Bip44ConfGetter.GetConfig(Bip44Coins.BITCOIN).AddrParams().get('net_ver')
    target_addr = P2PKHAddr.EncodeKey(node.PublicKey().RawCompressed().ToBytes(), net_ver=net_ver)

    targets = {target_addr}

    # Non-exhaustive should NOT find it
    res_non = check_candidate(mnemonic, targets, exhaustive=False)
    assert len(res_non) == 0

    # Exhaustive SHOULD find it
    res_ex = check_candidate(mnemonic, targets, exhaustive=True)
    assert any(m['address'] == target_addr for m in res_ex)
    assert any(m['type'] == 'mnemonic_extra_path' for m in res_ex)
