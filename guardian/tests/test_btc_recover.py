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
    assert len(res2) > 0
    assert any(m['address'] == "LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez" for m in res2)

def test_exhaustive_extra_paths():
    # Test BIP-48 like path or custom path
    # Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
    # m/0'/0 (Copay/BitPay/MultiBit) -> 1999S99m9m... (need a real one)
    # Actually let's just check if it finds a P2PKH on m/0/0
    mnemonic = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
    # m/0/0 -> 199266Ymi8vYvYvYvYvYvYvYvYvYvYvYvY (fake)
    # Let's use a known derivation from bip-utils for m/0/0
    from bip_utils import Bip32Secp256k1, Bip39SeedGenerator, P2PKHAddr, Bip44ConfGetter, Bip44Coins
    seed = Bip39SeedGenerator(mnemonic).Generate()
    root = Bip32Secp256k1.FromSeed(seed)
    derived = root.DerivePath("m/0/0")
    addr = P2PKHAddr.EncodeKey(derived.PublicKey().RawCompressed().ToBytes(),
                              net_ver=Bip44ConfGetter.GetConfig(Bip44Coins.BITCOIN).AddrParams().get('net_ver'))

    targets = {addr}
    res = check_candidate(mnemonic, targets, exhaustive=True)
    assert any(m['path'] == "m/0/0" for m in res)

def test_typo_mutations_extended():
    token = "password"
    typos = generate_typos(token)
    assert "password!" in typos
    assert "Password" in typos
    assert "p4ssword" in typos
    assert "passvvord" in typos
