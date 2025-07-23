import { mnemonicToSeedSync, validateMnemonic } from 'bip39';
import * as hdkey from 'hdkey';
import { ECPair, payments } from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { NETWORKS, DERIVATION_PATHS } from './config';

export interface HDWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function recoverFromMnemonic(mnemonic: string): HDWallet {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }

  const seed = mnemonicToSeedSync(mnemonic);
  const hdNode = hdkey.fromMasterSeed(seed);
  const btcNode = hdNode.derive(DERIVATION_PATHS.bitcoin);
  
  const network = NETWORKS.bitcoin;
  const keyPair = ECPair.fromPrivateKey(btcNode.privateKey, { network });
  const { address } = payments.p2pkh({ 
    pubkey: keyPair.publicKey,
    network 
  });

  return {
    address: address!,
    privateKey: btcNode.privateKey.toString('hex'),
    publicKey: btcNode.publicKey.toString('hex')
  };
}