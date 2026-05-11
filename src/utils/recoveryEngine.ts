import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import { DiscoveredWallet, SUPPORTED_NETWORKS, BIP44_PURPOSE, BIP49_PURPOSE, BIP84_PURPOSE, BIP86_PURPOSE, DEFAULT_SCAN_DEPTH, DEFAULT_ACCOUNTS } from '../types/recoveryPool';

// Network configurations for bitcoinjs-lib
const NETWORK_CONFIGS: Record<string, bitcoin.networks.Network> = {
  bitcoin: bitcoin.networks.bitcoin,
  'bitcoin-testnet': bitcoin.networks.testnet,
  'bitcoin-cash': {
    ...bitcoin.networks.bitcoin,
    messagePrefix: '\x18BitcoinCash Signed Message:\n',
    bech32: 'bch',
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
  },
  litecoin: {
    ...bitcoin.networks.bitcoin,
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  dash: {
    ...bitcoin.networks.bitcoin,
    messagePrefix: '\x19DarkCoin Signed Message:\n',
    pubKeyHash: 0x4c,
    scriptHash: 0x10,
    wif: 0xcc,
  },
};

// Derivation path templates
function getDerivationPath(purpose: number, coinType: number, account: number, change: number = 0, index: number = 0): string {
  return `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;
}

export function getAllDerivationPathTemplates(coinType: number): string[] {
  const templates: string[] = [];

  // Standard BIPs
  const purposes = [BIP44_PURPOSE, BIP49_PURPOSE, BIP84_PURPOSE, BIP86_PURPOSE];
  for (const purpose of purposes) {
    for (let account = 0; account < DEFAULT_ACCOUNTS; account++) {
      for (let change = 0; change < 2; change++) {
        for (let index = 0; index < DEFAULT_SCAN_DEPTH; index++) {
          templates.push(getDerivationPath(purpose, coinType, account, change, index));
        }
      }
    }
  }

  // Historical & Uncommon Legacy Shards
  if (coinType === 0) {
    templates.push("m/0'/0/0"); // BIP-32 Original / MultiBit HD / BRD
    templates.push("m/0/0");   // Old Electrum (< 2.0)
    templates.push("m/45'/0"); // BIP-45 Old Multisig
    templates.push("m/48'/0'/0'/1'"); // BIP-48 Nested SegWit Multisig
    templates.push("m/48'/0'/0'/2'"); // BIP-48 Native SegWit Multisig
    templates.push("m/47'/0'/0'"); // BIP-47 Payment Codes
  }

  return templates;
}

// Get network for a given network id
function getNetwork(networkId: string): bitcoin.networks.Network | undefined {
  return NETWORK_CONFIGS[networkId] || bitcoin.networks.bitcoin;
}

// Get derivation type from purpose
function getDerivationType(purpose: number): DiscoveredWallet['derivationType'] {
  switch (purpose) {
    case BIP44_PURPOSE: return 'BIP44';
    case BIP49_PURPOSE: return 'BIP49';
    case BIP84_PURPOSE: return 'BIP84';
    case BIP86_PURPOSE: return 'BIP86';
    default: return 'BIP44';
  }
}

// Derive address from seed
async function deriveAddressFromSeed(
  seed: string,
  networkId: string,
  purpose: number,
  coinType: number,
  account: number,
  change: number,
  index: number
): Promise<{ address: string; publicKey: string; privateKey: string; path: string } | null> {
  try {
    const network = getNetwork(networkId);
    if (!network) return null;

    const root = bitcoin.bip32.fromSeed(Buffer.from(seed, 'hex'), network);
    const path = getDerivationPath(purpose, coinType, account, change, index);
    const child = root.derivePath(path);
    let address: string | undefined;
    let pubkey: Buffer | undefined;

    if (purpose === BIP49_PURPOSE) {
      const payment = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network }),
        network,
      });
      address = payment.address;
      pubkey = child.publicKey;
    } else {
      const payment = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network,
      });
      address = payment.address;
      pubkey = payment.pubkey;
    }

    if (!address || !pubkey) return null;

    return {
      address,
      publicKey: pubkey.toString('hex'),
      privateKey: child.toWIF(),
      path,
    };
  } catch {
    return null;
  }
}

// Derive legacy (P2PKH) address (handles both compressed and uncompressed)
async function deriveLegacyAddresses(
  seed: string,
  networkId: string,
  coinType: number,
  account: number,
  change: number,
  index: number
): Promise<{ address: string; publicKey: string; privateKey: string; path: string }[]> {
  const results = [];
  try {
    const network = getNetwork(networkId);
    if (!network) return [];

    const root = bitcoin.bip32.fromSeed(Buffer.from(seed, 'hex'), network);
    const path = getDerivationPath(BIP44_PURPOSE, coinType, account, change, index);
    const child = root.derivePath(path);

    // 1. Compressed
    const comp = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network,
    });
    if (comp.address) {
      results.push({
        address: comp.address,
        publicKey: child.publicKey.toString('hex'),
        privateKey: child.toWIF(),
        path: `${path} (comp)`,
      });
    }

    // 2. Uncompressed (Only for Bitcoin/Litecoin legacy)
    if (['bitcoin', 'litecoin', 'dash'].includes(networkId)) {
      try {
        // Use secp256k1 to get uncompressed public key
        const uncompressedPubkey = Buffer.from(secp.pointHex(child.publicKey, false), 'hex');
        const uncomp = bitcoin.payments.p2pkh({
          pubkey: uncompressedPubkey,
          network,
        });
        if (uncomp.address) {
          results.push({
            address: uncomp.address,
            publicKey: uncompressedPubkey.toString('hex'),
            privateKey: child.toWIF(),
            path: `${path} (uncomp)`,
          });
        }
      } catch {}
    }

    return results;
  } catch {
    return [];
  }
}

// Scan all paths for a given seed phrase
export async function scanSeedPhrase(
  mnemonic: string,
  onProgress?: (progress: number, wallet: DiscoveredWallet | null) => void,
  passphrase?: string
): Promise<DiscoveredWallet[]> {
  const wallets: DiscoveredWallet[] = [];

  // Generate seed from mnemonic
  const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
  const seedHex = seed.toString('hex');

  const purposes = [BIP44_PURPOSE, BIP49_PURPOSE, BIP84_PURPOSE, BIP86_PURPOSE];

  // Comprehensive Custom Paths (from industry standards and legacy shards)
  const customPaths = [
    "m/0'/0/0",         // BIP-32 Original / MultiBit HD / BRD
    "m/0/0",           // Old Electrum (< 2.0)
    "m/45'/0",         // BIP-45 Old Multisig
    "m/48'/0'/0'/1'",  // BIP-48 Nested SegWit Multisig
    "m/48'/0'/0'/2'",  // BIP-48 Native SegWit Multisig
    "m/47'/0'/0'",     // BIP-47 Payment Codes
    "m/0'",            // Blockchain.info Legacy
    "m/0'/0",          // Copay / BitPay
    "m/44'/0'/0/0/0",  // Ledger Legacy variant
    "m/44'/0'/n'/0/0", // Copay / BitPay high account
    "m/1337'/611'/0'", // Arbiter Relay Bot / Custom Data Silo
  ];

  let totalSteps = (purposes.length * SUPPORTED_NETWORKS.length * DEFAULT_ACCOUNTS * DEFAULT_SCAN_DEPTH) + customPaths.length;
  let currentStep = 0;

  // 1. Scan standard BIP purposes
  for (const purpose of purposes) {
    for (const network of SUPPORTED_NETWORKS) {
      // Skip networks that don't support certain purposes
      if (purpose === BIP49_PURPOSE && ['ethereum', 'ethereum-classic'].includes(network.id)) continue;
      if ((purpose === BIP84_PURPOSE || purpose === BIP86_PURPOSE) && ['ethereum', 'ethereum-classic', 'dogecoin'].includes(network.id)) continue;

      for (let account = 0; account < DEFAULT_ACCOUNTS; account++) {
        for (let change = 0; change < 2; change++) {
          for (let index = 0; index < DEFAULT_SCAN_DEPTH; index++) {
            let result: { address: string; publicKey: string; privateKey: string; path: string } | null = null;

            try {
              if (network.id === 'ethereum' || network.id === 'ethereum-classic') {
                // For EVM chains, derive using secp256k1 then convert to ETH address
                const root = bitcoin.bip32.fromSeed(seed, bitcoin.networks.bitcoin);
                const path = getDerivationPath(BIP44_PURPOSE, network.coinType, account, change, index);
                const child = root.derivePath(path);
                const { ethers } = await import('ethers');
                const wallet = new ethers.Wallet('0x' + child.privateKey!.toString('hex'));
                result = {
                  address: wallet.address,
                  publicKey: wallet.publicKey,
                  privateKey: wallet.privateKey,
                  path,
                };
              } else {
                if (purpose === BIP44_PURPOSE) {
                  const legacyResults = await deriveLegacyAddresses(seedHex, network.id, network.coinType, account, change, index);
                  for (const res of legacyResults) {
                    const wallet: DiscoveredWallet = {
                      id: `${network.id}-${purpose}-${account}-${change}-${index}-${res.address}-${Date.now()}`,
                      network: network.id,
                      path: res.path,
                      address: res.address,
                      publicKey: res.publicKey,
                      privateKey: res.privateKey,
                      balance: 0,
                      balanceFormatted: '0',
                      symbol: network.symbol,
                      source: 'seed',
                      derivationType: getDerivationType(purpose),
                      accountIndex: account,
                      addressIndex: index,
                      unconfirmedBalance: 0,
                      unconfirmedBalanceFormatted: '0',
                      utxos: [],
                      utxoCount: 0,
                      transactions: [],
                      lastChecked: Date.now(),
                    };
                    wallets.push(wallet);
                    onProgress?.((currentStep / totalSteps) * 100, wallet);
                  }
                  currentStep++;
                  continue;
                } else if (purpose === BIP49_PURPOSE) {
                  result = await deriveAddressFromSeed(seedHex, network.id, purpose, network.coinType, account, change, index);
                } else if (purpose === BIP84_PURPOSE) {
                  result = await deriveAddressFromSeed(seedHex, network.id, purpose, network.coinType, account, change, index);
                } else if (purpose === BIP86_PURPOSE) {
                  result = await deriveAddressFromSeed(seedHex, network.id, purpose, network.coinType, account, change, index);
                }
              }
            } catch {
              // Continue on error
            }

            if (result) {
              const wallet: DiscoveredWallet = {
                id: `${network.id}-${purpose}-${account}-${change}-${index}-${Date.now()}`,
                network: network.id,
                path: result.path,
                address: result.address,
                publicKey: result.publicKey,
                privateKey: result.privateKey,
                balance: 0, // Will be populated by balance checker
                balanceFormatted: '0',
                symbol: network.symbol,
                source: 'seed',
                derivationType: getDerivationType(purpose),
                accountIndex: account,
                addressIndex: index,
                unconfirmedBalance: 0,
                unconfirmedBalanceFormatted: '0',
                utxos: [],
                utxoCount: 0,
                transactions: [],
                lastChecked: Date.now(),
              };
              wallets.push(wallet);
              onProgress?.((currentStep / totalSteps) * 100, wallet);
            }

            currentStep++;
          }
        }
      }
    }
  }

  // 2. Scan custom paths (Bitcoin only)
  for (const path of customPaths) {
    try {
      const root = bitcoin.bip32.fromSeed(seed, bitcoin.networks.bitcoin);
      const child = root.derivePath(path);

      // Try multiple script types for custom paths
      const scriptTypes = ['p2pkh', 'p2wpkh', 'p2sh-p2wpkh'];
      for (const type of scriptTypes) {
        let address: string | undefined;
        let derivationType: DiscoveredWallet['derivationType'] = 'BIP44';

        if (type === 'p2pkh') {
          address = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: bitcoin.networks.bitcoin }).address;
          derivationType = 'legacy';
        } else if (type === 'p2wpkh') {
          address = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: bitcoin.networks.bitcoin }).address;
          derivationType = 'BIP84';
        } else {
          address = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: bitcoin.networks.bitcoin }),
            network: bitcoin.networks.bitcoin,
          }).address;
          derivationType = 'BIP49';
        }

        if (address) {
          wallets.push({
            id: `custom-${path}-${type}-${Date.now()}`,
            network: 'bitcoin',
            path,
            address,
            publicKey: child.publicKey.toString('hex'),
            privateKey: child.toWIF(),
            balance: 0,
            balanceFormatted: '0',
            symbol: 'BTC',
            source: 'seed-custom',
            derivationType,
            accountIndex: 0,
            addressIndex: 0,
            unconfirmedBalance: 0,
            unconfirmedBalanceFormatted: '0',
            utxos: [],
            utxoCount: 0,
            transactions: [],
            lastChecked: Date.now(),
          });
        }
      }
    } catch { /* skip */ }
    currentStep++;
    onProgress?.((currentStep / totalSteps) * 100, null);
  }

  onProgress?.(100, null);
  return wallets;
}

// Scan a single private key across all networks
export async function scanPrivateKey(
  privateKey: string,
  onProgress?: (progress: number, wallet: DiscoveredWallet | null) => void
): Promise<DiscoveredWallet[]> {
  const wallets: DiscoveredWallet[] = [];
  const { ethers } = await import('ethers');

  let idx = 0;
  const totalNetworks = SUPPORTED_NETWORKS.length;

  for (const network of SUPPORTED_NETWORKS) {
    try {
      if (network.id === 'ethereum' || network.id === 'ethereum-classic') {
        // EVM chain
        let key = privateKey;
        if (!key.startsWith('0x')) key = '0x' + key;
        const wallet = new ethers.Wallet(key);
        wallets.push({
          id: `${network.id}-eth-${Date.now()}`,
          network: network.id,
          path: 'direct',
          address: wallet.address,
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey,
          balance: 0,
          balanceFormatted: '0',
          symbol: network.symbol,
          source: 'privateKey',
          derivationType: 'unknown',
          accountIndex: 0,
          addressIndex: 0,
          unconfirmedBalance: 0,
          unconfirmedBalanceFormatted: '0',
          utxos: [],
          utxoCount: 0,
          transactions: [],
          lastChecked: Date.now(),
        });
      } else {
        // UTXO-based chains
        const networkConfig = getNetwork(network.id);
        if (networkConfig) {
          try {
            // Try as WIF first
            const keyPair = bitcoin.ECPair.fromWIF(privateKey, networkConfig);
            const { address, pubkey } = bitcoin.payments.p2wpkh({
              pubkey: keyPair.publicKey,
              network: networkConfig,
            });
            if (address) {
              wallets.push({
                id: `${network.id}-wif-${Date.now()}-${idx}`,
                network: network.id,
                path: 'WIF',
                address,
                publicKey: pubkey?.toString('hex'),
                privateKey: keyPair.toWIF(),
                balance: 0,
                balanceFormatted: '0',
                symbol: network.symbol,
                source: 'wif',
                derivationType: 'BIP84',
                accountIndex: 0,
                addressIndex: idx,
                unconfirmedBalance: 0,
                unconfirmedBalanceFormatted: '0',
                utxos: [],
                utxoCount: 0,
                transactions: [],
                lastChecked: Date.now(),
              });
            }

            // Also try legacy P2PKH
            const { address: legacyAddr, pubkey: legacyPub } = bitcoin.payments.p2pkh({
              pubkey: keyPair.publicKey,
              network: networkConfig,
            });
            if (legacyAddr && legacyAddr !== address) {
              wallets.push({
                id: `${network.id}-legacy-${Date.now()}-${idx}`,
                network: network.id,
                path: 'legacy-p2pkh',
                address: legacyAddr,
                publicKey: legacyPub?.toString('hex'),
                privateKey: keyPair.toWIF(),
                balance: 0,
                balanceFormatted: '0',
                symbol: network.symbol,
                source: 'privateKey',
                derivationType: 'legacy',
                accountIndex: 0,
                addressIndex: idx,
                unconfirmedBalance: 0,
                unconfirmedBalanceFormatted: '0',
                utxos: [],
                utxoCount: 0,
                transactions: [],
                lastChecked: Date.now(),
              });
            }
          } catch {
            // Try as raw hex private key
            const privateKeyBuffer = Buffer.from(privateKey.replace(/^0x/, ''), 'hex');
            const keyPair = bitcoin.ECPair.fromPrivateKey(privateKeyBuffer, { network: networkConfig });
            const { address, pubkey } = bitcoin.payments.p2wpkh({
              pubkey: keyPair.publicKey,
              network: networkConfig,
            });
            if (address) {
              wallets.push({
                id: `${network.id}-hex-${Date.now()}-${idx}`,
                network: network.id,
                path: 'direct-hex',
                address,
                publicKey: pubkey?.toString('hex'),
                privateKey: keyPair.toWIF(),
                balance: 0,
                balanceFormatted: '0',
                symbol: network.symbol,
                source: 'privateKey',
                derivationType: 'BIP84',
                accountIndex: 0,
                addressIndex: idx,
                unconfirmedBalance: 0,
                unconfirmedBalanceFormatted: '0',
                utxos: [],
                utxoCount: 0,
                transactions: [],
                lastChecked: Date.now(),
              });
            }
          }
        }
      }
    } catch {
      // Continue on error
    }

    idx++;
    onProgress?.((idx / totalNetworks) * 100, wallets[wallets.length - 1] || null);
  }

  onProgress?.(100, null);
  return wallets;
}

// Validate a mnemonic
export function validateMnemonic(mnemonic: string): boolean {
  try {
    return bip39.validateMnemonic(mnemonic);
  } catch {
    return false;
  }
}
