import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import bs58check from 'bs58check';
import * as ecc from '@bitcoinerlab/secp256k1';

bitcoin.initEccLib(ecc as any);

export type InputKind = 'hex' | 'wif' | 'decimal' | 'binary' | 'mnemonic' | 'brainwallet';

export interface UniversalKeyResult {
  privateKeyHex: string;
  privateKeyDecimal: string;
  privateKeyBinary: string;
  wif: string;
  compressedPublicKey: string;
  uncompressedPublicKey: string;
  addresses: {
    bitcoinLegacy: string;
    bitcoinSegwit: string;
    bitcoinNestedSegwit: string;
    bitcoinTaproot?: string;
    ethereum: string;
    bnb: string;
    tron: string;
  };
  derivationPath?: string;
}

const BTC_NETWORK = bitcoin.networks.bitcoin;

function isHex64(input: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(input.replace(/^0x/, ''));
}

function inferInputKind(input: string): InputKind {
  const trimmed = input.trim();
  if (trimmed.split(/\s+/).length >= 12 && bip39.validateMnemonic(trimmed.toLowerCase())) return 'mnemonic';
  if (/^(5|K|L)[1-9A-HJ-NP-Za-km-z]{50,51}$/.test(trimmed)) return 'wif';
  if (/^[01]{64,256}$/.test(trimmed)) return 'binary';
  if (/^[0-9]{1,78}$/.test(trimmed)) return 'decimal';
  if (isHex64(trimmed)) return 'hex';
  return 'brainwallet';
}

function toTronAddress(ethAddress: string): string {
  const hex = `41${ethAddress.toLowerCase().replace(/^0x/, '')}`;
  const payload = Buffer.from(hex, 'hex');
  return bs58check.encode(payload);
}

function privateKeyHexFromInput(input: string, kind?: InputKind): { keyHex: string; kind: InputKind; derivationPath?: string } {
  const normalized = input.trim();
  const resolvedKind = kind || inferInputKind(normalized);

  switch (resolvedKind) {
    case 'hex': {
      const key = normalized.replace(/^0x/, '').toLowerCase();
      if (!isHex64(key)) throw new Error('Invalid HEX private key. Expected 64 hex chars.');
      return { keyHex: key, kind: resolvedKind };
    }
    case 'wif': {
      const keyPair = bitcoin.ECPair.fromWIF(normalized, BTC_NETWORK);
      if (!keyPair.privateKey) throw new Error('Unable to decode WIF private key.');
      return { keyHex: keyPair.privateKey.toString('hex'), kind: resolvedKind };
    }
    case 'decimal': {
      const big = BigInt(normalized);
      if (big <= 0n) throw new Error('Decimal private key must be greater than zero.');
      return { keyHex: big.toString(16).padStart(64, '0'), kind: resolvedKind };
    }
    case 'binary': {
      if (!/^[01]{64,256}$/.test(normalized)) {
        throw new Error('Binary private key must contain only 0/1.');
      }
      const big = BigInt(`0b${normalized}`);
      return { keyHex: big.toString(16).padStart(64, '0'), kind: resolvedKind };
    }
    case 'mnemonic': {
      const mnemonic = normalized.toLowerCase();
      if (!bip39.validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic phrase.');
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = bitcoin.bip32.fromSeed(seed, BTC_NETWORK);
      const child = root.derivePath("m/44'/0'/0'/0/0");
      if (!child.privateKey) throw new Error('Unable to derive key from mnemonic.');
      return { keyHex: child.privateKey.toString('hex'), kind: resolvedKind, derivationPath: "m/44'/0'/0'/0/0" };
    }
    case 'brainwallet': {
      const hash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(normalized));
      return { keyHex: hash.replace(/^0x/, ''), kind: resolvedKind };
    }
    default:
      throw new Error('Unsupported input type.');
  }
}

export function calculateUniversalKey(input: string, forcedKind?: InputKind): UniversalKeyResult {
  const { keyHex, derivationPath } = privateKeyHexFromInput(input, forcedKind);
  const prefixed = `0x${keyHex}`;

  const signingKey = new ethers.utils.SigningKey(prefixed);
  const compressedPublicKey = signingKey.compressedPublicKey.replace(/^0x/, '');
  const uncompressedPublicKey = signingKey.publicKey.replace(/^0x/, '');

  const keyPair = bitcoin.ECPair.fromPrivateKey(Buffer.from(keyHex, 'hex'), { network: BTC_NETWORK, compressed: true });
  const wif = keyPair.toWIF();

  const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: BTC_NETWORK }).address;
  const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: BTC_NETWORK }).address;
  const p2sh = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: BTC_NETWORK }), network: BTC_NETWORK }).address;

  const xOnly = keyPair.publicKey.subarray(1, 33);
  const p2tr = bitcoin.payments.p2tr({ internalPubkey: xOnly, network: BTC_NETWORK }).address;

  const ethWallet = new ethers.Wallet(prefixed);

  return {
    privateKeyHex: keyHex,
    privateKeyDecimal: BigInt(`0x${keyHex}`).toString(10),
    privateKeyBinary: BigInt(`0x${keyHex}`).toString(2).padStart(256, '0'),
    wif,
    compressedPublicKey,
    uncompressedPublicKey,
    addresses: {
      bitcoinLegacy: p2pkh || '',
      bitcoinSegwit: p2wpkh || '',
      bitcoinNestedSegwit: p2sh || '',
      bitcoinTaproot: p2tr,
      ethereum: ethWallet.address,
      bnb: ethWallet.address,
      tron: toTronAddress(ethWallet.address),
    },
    derivationPath,
  };
}

export function incrementPrivateKey(hex: string, delta: 1n | -1n): string {
  const current = BigInt(`0x${hex.replace(/^0x/, '')}`);
  const max = (1n << 256n) - 1n;
  let next = current + delta;
  if (next < 1n) next = 1n;
  if (next > max) next = max;
  return next.toString(16).padStart(64, '0');
}

export function detectInputKind(input: string): InputKind {
  return inferInputKind(input);
}
