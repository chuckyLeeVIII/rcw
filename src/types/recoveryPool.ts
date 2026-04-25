// UTXO tracking for Bitcoin-like chains
export interface UTXOEntry {
  txid: string;
  vout: number;
  value: number;
  height: number;
  confirmations: number;
  address: string;
  scriptPubKey?: string;
}

// Transaction state tracking
export interface TransactionState {
  txid: string;
  type: 'send' | 'receive';
  amount: number;
  fee?: number;
  confirmations: number;
  blockHeight?: number;
  timestamp: number;
  status: 'unconfirmed' | 'confirmed' | 'pending' | 'failed';
}

// Recovery Pool - manages all discovered wallets and their addresses
export interface DiscoveredWallet {
  id: string;
  network: string;
  path: string;
  address: string;
  publicKey?: string;
  privateKey?: string;
  wif?: string;
  balance: number;
  balanceFormatted: string;
  // NEW: Unconfirmed balance tracking
  unconfirmedBalance: number;
  unconfirmedBalanceFormatted: string;
  // NEW: UTXO tracking for Bitcoin-like chains
  utxos: UTXOEntry[];
  utxoCount: number;
  // NEW: Transaction state
  transactions: TransactionState[];
  lastChecked: number;
  // Existing fields
  symbol: string;
  source: 'seed' | 'privateKey' | 'datFile' | 'wif' | 'encrypted';
  derivationType: 'BIP44' | 'BIP49' | 'BIP84' | 'BIP86' | 'legacy' | 'unknown';
  accountIndex: number;
  addressIndex: number;
  // NEW: Cross-chain linkage
  relatedAddresses?: string[]; // addresses derived from same seed on other chains
  crossChainBalances?: Record<string, number>; // network -> balance
}

export interface RecoverySource {
  id: string;
  type: 'seed' | 'privateKey' | 'wif' | 'datFile' | 'encrypted' | 'masterKey';
  label: string;
  timestamp: number;
  walletsFound: number;
}

export interface RecoveryPoolState {
  sources: RecoverySource[];
  discoveredWallets: DiscoveredWallet[];
  isScanning: boolean;
  scanProgress: number;
  totalBalance: Record<string, number>;
  totalBalanceFormatted: Record<string, string>;
  networksScanned: string[];
}

export interface NetworkInfo {
  id: string;
  name: string;
  symbol: string;
  coinType: number;
  rpcUrl?: string;
  explorerUrl?: string;
}

export const SUPPORTED_NETWORKS: NetworkInfo[] = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', coinType: 0, explorerUrl: 'https://blockchair.com/bitcoin' },
  { id: 'bitcoin-testnet', name: 'Bitcoin Testnet', symbol: 'tBTC', coinType: 1, explorerUrl: 'https://blockchair.com/bitcoin/testnet' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', coinType: 2, explorerUrl: 'https://blockchair.com/litecoin' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', coinType: 3, explorerUrl: 'https://blockchair.com/dogecoin' },
  { id: 'dash', name: 'Dash', symbol: 'DASH', coinType: 5, explorerUrl: 'https://blockchair.com/dash' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', coinType: 60, rpcUrl: 'https://eth.llamarpc.com', explorerUrl: 'https://etherscan.io' },
  { id: 'ethereum-classic', name: 'Ethereum Classic', symbol: 'ETC', coinType: 61, explorerUrl: 'https://blockchair.com/ethereum-classic' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', coinType: 145, explorerUrl: 'https://blockchair.com/bitcoin-cash' },
];

// All standard BIP derivation paths
export const BIP44_PURPOSE = 44;
export const BIP49_PURPOSE = 49;
export const BIP84_PURPOSE = 84;
export const BIP86_PURPOSE = 86;

export const DEFAULT_SCAN_DEPTH = 20; // addresses per path
export const DEFAULT_ACCOUNTS = 5; // accounts to scan per network

export function createRecoveryPoolState(): RecoveryPoolState {
  return {
    sources: [],
    discoveredWallets: [],
    isScanning: false,
    scanProgress: 0,
    totalBalance: {},
    totalBalanceFormatted: {},
    networksScanned: [],
  };
}

// ─── Master Ledger Types ─────────────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  type: 'wallet' | 'key' | 'address' | 'transaction';
  network: string;
  address?: string;
  publicKey?: string;
  privateKeyRef?: string; // reference to encrypted key
  balance: number;
  unconfirmedBalance: number;
  utxoCount: number;
  status: 'active' | 'empty' | 'dead' | 'archived';
  createdAt: number;
  lastActivity: number;
  metadata?: Record<string, any>;
}

export interface MasterLedger {
  entries: LedgerEntry[];
  totalEntries: number;
  totalBalance: Record<string, number>;
  totalUnconfirmed: Record<string, number>;
  activeKeys: number;
  emptyKeys: number;
  deadKeys: number;
  lastUpdated: number;
  crossChainSummary: CrossChainSummary;
}

export interface CrossChainSummary {
  totalNetworks: number;
  networks: Record<string, {
    confirmed: number;
    unconfirmed: number;
    utxoCount: number;
    addressCount: number;
    activeWallets: number;
  }>;
  aggregateValue: Record<string, number>; // normalized values
  recoveryScore: number; // 0-100 score indicating recovery completeness
}

// ─── Cross-Chain Calculation Types ───────────────────────────────────────
export interface CrossChainWallet {
  seedFingerprint: string; // hash of the seed for grouping
  addresses: Array<{
    network: string;
    address: string;
    path: string;
    balance: number;
    unconfirmed: number;
    utxoCount: number;
  }>;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUTXOs: number;
  networksActive: number[];
}

export interface RecoveryReport {
  totalScanned: number;
  totalFound: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUTXOs: number;
  emptyAddresses: number;
  deadAddresses: number;
  crossChainWallets: CrossChainWallet[];
  networkBreakdown: Record<string, {
    confirmed: number;
    unconfirmed: number;
    utxos: number;
    addresses: number;
  }>;
  recoveryScore: number;
  recommendations: string[];
}

export function calculateTotalBalances(wallets: DiscoveredWallet[]): Record<string, { total: number; formatted: string; symbol: string }> {
  const totals: Record<string, { total: number; formatted: string; symbol: string }> = {};
  for (const wallet of wallets) {
    if (!totals[wallet.network]) {
      totals[wallet.network] = { total: 0, formatted: '0', symbol: wallet.symbol };
    }
    totals[wallet.network].total += wallet.balance;
    totals[wallet.network].formatted = totals[wallet.network].total.toFixed(8);
  }
  return totals;
}

export function getUniqueAddresses(wallets: DiscoveredWallet[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const wallet of wallets) {
    if (!seen.has(wallet.address)) {
      seen.add(wallet.address);
      unique.push(wallet.address);
    }
  }
  return unique;
}
