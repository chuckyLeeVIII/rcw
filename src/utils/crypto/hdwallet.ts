import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';

const bip32 = BIP32Factory(ecc);

export interface HDWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function recoverFromMnemonic(mnemonic: string): HDWallet {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed);

  // Derivation path: m/44'/0'/0'/0/0 (Bitcoin Legacy)
  const child = root.derivePath("m/44'/0'/0'/0/0");

  const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey });

  return {
    address: address!,
    privateKey: child.privateKey!.toString('hex'),
    publicKey: child.publicKey.toString('hex')
  };
}
