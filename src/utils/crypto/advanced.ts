import { Buffer } from 'buffer';
import { createHash, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto-browserify';

export interface CryptoFuzzParams {
  masterKey: string;
  salt: string;
  iv: string;
  iterations: number;
  rawInput: string;
}

export interface PyWalletParams {
  encryptedData: string;
  passphrase: string;
  network?: 'bitcoin' | 'testnet';
}

export class AdvancedRecovery {
  static async cryptoFuzz({ masterKey, salt, iv, iterations, rawInput }: CryptoFuzzParams) {
    try {
      // Convert hex strings to buffers
      const masterKeyBuffer = Buffer.from(masterKey, 'hex');
      const saltBuffer = Buffer.from(salt, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      
      // Derive key using PBKDF2
      const derivedKey = pbkdf2Sync(
        masterKeyBuffer,
        saltBuffer,
        iterations,
        32,
        'sha512'
      );

      // Create cipher
      const cipher = createCipheriv('aes-256-gcm', derivedKey, ivBuffer);
      
      // Encrypt raw input
      const encrypted = Buffer.concat([
        cipher.update(rawInput, 'utf8'),
        cipher.final()
      ]);

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Return encrypted data and auth tag
      return {
        encryptedData: encrypted.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`CryptoFuzz recovery failed: ${error.message}`);
    }
  }

  static async pyWallet({ encryptedData, passphrase, network = 'bitcoin' }: PyWalletParams) {
    try {
      // Hash passphrase for key derivation
      const passphraseHash = createHash('sha256')
        .update(passphrase)
        .digest();

      // Extract salt and IV from encrypted data
      const encBuffer = Buffer.from(encryptedData, 'hex');
      const salt = encBuffer.slice(0, 32);
      const iv = encBuffer.slice(32, 48);
      const data = encBuffer.slice(48);

      // Derive key using PBKDF2
      const key = pbkdf2Sync(
        passphraseHash,
        salt,
        50000, // PyWallet default iterations
        32,
        'sha512'
      );

      // Decrypt data
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final()
      ]);

      return {
        privateKey: decrypted.toString('hex'),
        network
      };
    } catch (error) {
      throw new Error(`PyWallet recovery failed: ${error.message}`);
    }
  }

  static async bruteforce(params: {
    target: string;
    charset: string;
    maxLength: number;
    callback?: (attempt: string) => void
  }) {
    const { target, charset, maxLength, callback } = params;
    
    function* generateCombinations(length: number): Generator<string> {
      const chars = charset.split('');
      const total = Math.pow(chars.length, length);
      
      for (let i = 0; i < total; i++) {
        let combination = '';
        let num = i;
        
        for (let j = 0; j < length; j++) {
          combination = chars[num % chars.length] + combination;
          num = Math.floor(num / chars.length);
        }
        
        yield combination;
      }
    }

    for (let length = 1; length <= maxLength; length++) {
      for (const attempt of generateCombinations(length)) {
        if (callback) {
          callback(attempt);
        }
        
        const hash = createHash('sha256')
          .update(attempt)
          .digest('hex');
        
        if (hash === target) {
          return attempt;
        }
      }
    }
    
    throw new Error('No match found');
  }
}