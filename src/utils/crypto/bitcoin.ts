import { ECPair, payments } from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { NETWORKS } from './config';

export interface BitcoinWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function recoverFromWIF(wif: string): BitcoinWallet {
  const network = NETWORKS.bitcoin;
  const keyPair = ECPair.fromWIF(wif, network);
  const { address } = payments.p2pkh({ 
    pubkey: keyPair.publicKey,
    network
  });
  
  return {
    address: address!,
    privateKey: keyPair.privateKey!.toString('hex'),
    publicKey: keyPair.publicKey.toString('hex')
  };
}

export function recoverFromPrivateKey(privateKeyHex: string): BitcoinWallet {
  const network = NETWORKS.bitcoin;
  const keyPair = ECPair.fromPrivateKey(
    Buffer.from(privateKeyHex, 'hex'),
    { network }
  );
  const { address } = payments.p2pkh({ 
    pubkey: keyPair.publicKey,
    network
  });
  
  return {
    address: address!,
    privateKey: privateKeyHex,
    publicKey: keyPair.publicKey.toString('hex')
  };
}