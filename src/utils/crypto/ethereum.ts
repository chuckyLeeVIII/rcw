import { Wallet } from 'ethereumjs-wallet';
import { Buffer } from 'buffer';

export interface EthereumWallet {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function recoverFromPrivateKey(privateKeyHex: string): EthereumWallet {
  const wallet = Wallet.fromPrivateKey(Buffer.from(privateKeyHex, 'hex'));
  
  return {
    address: wallet.getAddressString(),
    privateKey: wallet.getPrivateKeyString(),
    publicKey: wallet.getPublicKeyString()
  };
}