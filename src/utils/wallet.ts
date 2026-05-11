import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import { ECPairFactory } from 'ecpair';
import * as secp from '@bitcoinerlab/secp256k1';

export interface WalletInfo {
  network?: string;
  address?: string;
  legacyAddress?: string;
  segwitAddress?: string;
  privateKey?: string;
  publicKey?: string;
  seedPhrase?: string;
  error?: string;
}

const ECPair = ECPairFactory(secp);
const BIP32 = bip32.BIP32Factory(secp);

export class WalletManager {
  static async validateAndRecover(input: string): Promise<WalletInfo> {
    try {
      const trimmed = input.trim();

      // BIP39 mnemonic check
      if (trimmed.split(/\s+/).length >= 12) {
        if (bip39.validateMnemonic(trimmed)) {
          const seed = await bip39.mnemonicToSeed(trimmed);
          // ETH derivation
          const ethWallet = ethers.Wallet.fromMnemonic(trimmed);
          // BTC derivation
          const root = BIP32.fromSeed(seed);
          const child = root.derivePath("m/84'/0'/0'/0/0");
          const btcAddr = bitcoin.payments.p2wpkh({ pubkey: child.publicKey }).address;
          return {
            seedPhrase: trimmed,
            address: ethWallet.address,
            segwitAddress: btcAddr || undefined,
            privateKey: ethWallet.privateKey,
          };
        }
      }

      // Hex private key (64 or 66 chars)
      if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        const wallet = new ethers.Wallet(trimmed);
        const btcKey = ECPair.fromPrivateKey(Buffer.from(trimmed, 'hex'));
        const btcAddr = bitcoin.payments.p2wpkh({ pubkey: btcKey.publicKey }).address;
        return {
          address: wallet.address,
          privateKey: trimmed,
          segwitAddress: btcAddr || undefined,
        };
      }

      // WIF
      if (/^[KL5][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(trimmed)) {
        const keyPair = ECPair.fromWIF(trimmed);
        const btcAddr = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey }).address;
        const legacyAddr = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
        return {
          segwitAddress: btcAddr || undefined,
          legacyAddress: legacyAddr || undefined,
          privateKey: keyPair.privateKey?.toString('hex'),
        };
      }

      return { error: 'Unrecognized input format. Provide mnemonic, hex private key, or WIF.' };
    } catch (err: any) {
      return { error: err.message || 'Recovery failed' };
    }
  }

  static async advancedRecover(params: { mnemonic: string; path: string; passphrase?: string }): Promise<WalletInfo> {
    try {
      const { mnemonic, path, passphrase } = params;
      if (!bip39.validateMnemonic(mnemonic)) {
        return { error: 'Invalid mnemonic' };
      }
      const seed = await bip39.mnemonicToSeed(mnemonic, passphrase || '');
      const root = BIP32.fromSeed(seed);
      const child = root.derivePath(path);
      const btcAddr = bitcoin.payments.p2wpkh({ pubkey: child.publicKey }).address;
      return {
        seedPhrase: mnemonic,
        segwitAddress: btcAddr || undefined,
        privateKey: child.privateKey?.toString('hex'),
        publicKey: child.publicKey.toString('hex'),
      };
    } catch (err: any) {
      return { error: err.message || 'Advanced recovery failed' };
    }
  }

  static async recoverPyWallet(params: { dumpText: string; password?: string }): Promise<WalletInfo> {
    try {
      const { dumpText } = params;
      // Extract WIF or hex keys from pywallet dump text
      const wifMatch = dumpText.match(/[KL5][1-9A-HJ-NP-Za-km-z]{51}/);
      if (wifMatch) {
        return WalletManager.validateAndRecover(wifMatch[0]);
      }
      const hexMatch = dumpText.match(/\b[0-9a-fA-F]{64}\b/);
      if (hexMatch) {
        return WalletManager.validateAndRecover(hexMatch[0]);
      }
      return { error: 'No valid keys found in pywallet dump' };
    } catch (err: any) {
      return { error: err.message || 'pywallet recovery failed' };
    }
  }

  static async bruteforceRecover(params: { partialMnemonic: string; wordlist?: string[] }): Promise<WalletInfo> {
    try {
      const { partialMnemonic } = params;
      const words = partialMnemonic.trim().split(/\s+/);
      if (words.length < 12) {
        return { error: 'Partial mnemonic too short (need at least 12 words)' };
      }
      if (bip39.validateMnemonic(partialMnemonic)) {
        return WalletManager.validateAndRecover(partialMnemonic);
      }
      return { error: 'Brute force not implemented for incomplete mnemonics. Use BTCRecover token lists instead.' };
    } catch (err: any) {
      return { error: err.message || 'Brute force recovery failed' };
    }
  }
}
