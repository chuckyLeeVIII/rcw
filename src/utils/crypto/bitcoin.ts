import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);

export interface BitcoinWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function recoverFromPrivateKey(privateKeyHex: string): BitcoinWallet {
  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'));
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

  return {
    address: address!,
    privateKey: privateKeyHex,
    publicKey: keyPair.publicKey.toString('hex')
  };
}

export function recoverFromWIF(wif: string): BitcoinWallet {
  const keyPair = ECPair.fromWIF(wif);
  const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });

  return {
    address: address!,
    privateKey: keyPair.privateKey!.toString('hex'),
    publicKey: keyPair.publicKey.toString('hex')
  };
}
