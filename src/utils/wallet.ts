import { WalletImportFormat } from './cryptofuzz';
import { AdvancedRecovery } from './crypto/advanced';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { HDKey } from '@scure/bip32';
import { ethers } from 'ethers';
import { createHash } from 'crypto-browserify';

bitcoin.initEccLib(ecc);

export interface WalletInfo {
  address: string;
  privateKey: string;
  network: string;
  legacyAddress?: string;
  segwitAddress?: string;
  seedPhrase?: string;
  publicKey?: string;
  path?: string;
  encryptedBackup?: string;
}

export interface AdvancedRecoveryParams {
  masterKey: string;
  salt: string;
  iv: string;
  iterations: number;
  rawInput: string;
}

export interface PyWalletRecoveryParams {
  encryptedData: string;
  passphrase: string;
  network?: 'bitcoin' | 'testnet';
}

export class WalletManager {
  static async validateAndRecover(input: string): Promise<WalletInfo> {
    try {
      // Try BIP39 mnemonic
      if (bip39.validateMnemonic(input)) {
        return await this.recoverFromMnemonic(input);
      }

      // Try WIF (Bitcoin)
      try {
        return await this.recoverFromWIF(input);
      } catch {}

      // Try private key (hex)
      if (input.match(/^[0-9a-fA-F]{64}$/)) {
        return await this.recoverFromPrivateKey(input);
      }

      // Try CryptoFuzz recovery
      const wif = new WalletImportFormat();
      const result = wif.run(input);
      if (result) {
        return {
          address: `0x${result.substring(0, 40)}`,
          privateKey: result,
          network: 'ethereum'
        };
      }

      throw new Error('Invalid input format');
    } catch (error) {
      throw new Error(`Wallet recovery failed: ${error.message}`);
    }
  }

  static async recoverFromMnemonic(mnemonic: string): Promise<WalletInfo> {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdKey = HDKey.fromMasterSeed(seed);
    
    // Derive Bitcoin path
    const btcPath = "m/44'/0'/0'/0/0";
    const btcChild = hdKey.derive(btcPath);
    const btcKeyPair = bitcoin.ECPair.fromPrivateKey(btcChild.privateKey!);
    const { address: btcAddress } = bitcoin.payments.p2pkh({ 
      pubkey: btcKeyPair.publicKey 
    });

    // Derive Ethereum path
    const ethPath = "m/44'/60'/0'/0/0";
    const ethChild = hdKey.derive(ethPath);
    const ethWallet = new ethers.Wallet(ethChild.privateKey!);

    return {
      address: ethWallet.address,
      privateKey: ethChild.privateKey!.toString('hex'),
      network: 'multi',
      legacyAddress: btcAddress,
      segwitAddress: bitcoin.payments.p2wpkh({ 
        pubkey: btcKeyPair.publicKey 
      }).address,
      seedPhrase: mnemonic,
      publicKey: ethWallet.publicKey,
      path: ethPath
    };
  }

  static async recoverFromWIF(wif: string): Promise<WalletInfo> {
    const keyPair = bitcoin.ECPair.fromWIF(wif);
    const { address } = bitcoin.payments.p2pkh({ 
      pubkey: keyPair.publicKey 
    });

    return {
      address: address!,
      privateKey: keyPair.privateKey!.toString('hex'),
      network: 'bitcoin',
      legacyAddress: address,
      segwitAddress: bitcoin.payments.p2wpkh({ 
        pubkey: keyPair.publicKey 
      }).address,
      publicKey: keyPair.publicKey.toString('hex')
    };
  }

  static async recoverFromPrivateKey(privateKey: string): Promise<WalletInfo> {
    // Try Ethereum
    try {
      const wallet = new ethers.Wallet(privateKey);
      return {
        address: wallet.address,
        privateKey: privateKey,
        network: 'ethereum',
        publicKey: wallet.publicKey
      };
    } catch {}

    // Try Bitcoin
    try {
      const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
      const { address } = bitcoin.payments.p2pkh({ 
        pubkey: keyPair.publicKey 
      });

      return {
        address: address!,
        privateKey: privateKey,
        network: 'bitcoin',
        legacyAddress: address,
        segwitAddress: bitcoin.payments.p2wpkh({ 
          pubkey: keyPair.publicKey 
        }).address,
        publicKey: keyPair.publicKey.toString('hex')
      };
    } catch {}

    throw new Error('Invalid private key');
  }

  static async recoverFromFile(fileContent: string): Promise<WalletInfo> {
    try {
      // Try parsing as JSON
      const data = JSON.parse(fileContent);
      
      // Handle wallet.dat format
      if (data.version && data.keys) {
        return this.recoverFromWalletDat(data);
      }
      
      // Handle raw private key
      if (data.privateKey || data.private_key) {
        return this.validateAndRecover(data.privateKey || data.private_key);
      }
      
      // Handle seed phrase
      if (data.mnemonic || data.seed_phrase) {
        return this.validateAndRecover(data.mnemonic || data.seed_phrase);
      }

      throw new Error('Unsupported wallet file format');
    } catch (error) {
      throw new Error(`File recovery failed: ${error.message}`);
    }
  }

  static async recoverFromWalletDat(data: any): Promise<WalletInfo> {
    // Basic wallet.dat structure validation
    if (!data.version || !data.keys || !Array.isArray(data.keys)) {
      throw new Error('Invalid wallet.dat format');
    }

    // Find the first valid key
    for (const key of data.keys) {
      try {
        if (key.privkey) {
          return await this.validateAndRecover(key.privkey);
        }
      } catch {}
    }

    throw new Error('No valid keys found in wallet.dat');
  }

  static async advancedRecover(params: AdvancedRecoveryParams): Promise<WalletInfo> {
    try {
      const result = await AdvancedRecovery.cryptoFuzz(params);
      
      // Use the encrypted data to generate a deterministic wallet
      const seed = createHash('sha256')
        .update(result.encryptedData + result.authTag)
        .digest();
      
      const hdKey = HDKey.fromMasterSeed(seed);
      const ethChild = hdKey.derive("m/44'/60'/0'/0/0");
      const wallet = new ethers.Wallet(ethChild.privateKey!);

      return {
        address: wallet.address,
        privateKey: ethChild.privateKey!.toString('hex'),
        network: 'ethereum',
        publicKey: wallet.publicKey,
        encryptedBackup: result.encryptedData
      };
    } catch (error) {
      throw new Error(`Advanced recovery failed: ${error.message}`);
    }
  }

  static async recoverPyWallet(params: PyWalletRecoveryParams): Promise<WalletInfo> {
    try {
      const result = await AdvancedRecovery.pyWallet(params);
      return this.recoverFromPrivateKey(result.privateKey);
    } catch (error) {
      throw new Error(`PyWallet recovery failed: ${error.message}`);
    }
  }

  static async bruteforceRecover(params: {
    target: string;
    charset?: string;
    maxLength?: number;
    onProgress?: (attempt: string) => void;
  }): Promise<WalletInfo> {
    try {
      const charset = params.charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const maxLength = params.maxLength || 8;

      const password = await AdvancedRecovery.bruteforce({
        target: params.target,
        charset,
        maxLength,
        callback: params.onProgress
      });

      // Use the password to generate a deterministic wallet
      const seed = createHash('sha256')
        .update(password)
        .digest();

      const hdKey = HDKey.fromMasterSeed(seed);
      const ethChild = hdKey.derive("m/44'/60'/0'/0/0");
      const wallet = new ethers.Wallet(ethChild.privateKey!);

      return {
        address: wallet.address,
        privateKey: ethChild.privateKey!.toString('hex'),
        network: 'ethereum',
        publicKey: wallet.publicKey,
        seedPhrase: password
      };
    } catch (error) {
      throw new Error(`Bruteforce recovery failed: ${error.message}`);
    }
  }
}