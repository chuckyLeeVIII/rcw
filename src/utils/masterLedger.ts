// Master Ledger - Central tracking for all wallets, keys, and cross-chain state
import {
  MasterLedger,
  LedgerEntry,
  DiscoveredWallet,
  CrossChainSummary,
  CrossChainWallet,
  RecoveryReport,
  RecoverySource,
} from '../types/recoveryPool';

// ─── Helper: Generate unique ID ──────────────────────────────────────────
let ledgerIdCounter = 0;
function nextLedgerId() {
  return `ledger-${++ledgerIdCounter}-${Date.now()}`;
}

// ─── Helper: Create empty cross-chain summary ────────────────────────────
function createEmptyCrossChainSummary(): CrossChainSummary {
  return {
    totalNetworks: 0,
    networks: {},
    aggregateValue: {},
    recoveryScore: 0,
  };
}

// ─── Helper: Create empty master ledger ──────────────────────────────────
export function createEmptyMasterLedger(): MasterLedger {
  return {
    entries: [],
    totalEntries: 0,
    totalBalance: {},
    totalUnconfirmed: {},
    activeKeys: 0,
    emptyKeys: 0,
    deadKeys: 0,
    lastUpdated: Date.now(),
    crossChainSummary: createEmptyCrossChainSummary(),
  };
}

// ─── Convert DiscoveredWallet to LedgerEntry ─────────────────────────────
export function walletToLedgerEntry(wallet: DiscoveredWallet): LedgerEntry {
  const hasBalance = wallet.balance > 0 || wallet.unconfirmedBalance > 0;
  const hasUTXOs = wallet.utxoCount > 0;
  
  let status: 'active' | 'empty' | 'dead' | 'archived' = 'active';
  if (!hasBalance && !hasUTXOs) {
    status = 'empty';
  }
  
  return {
    id: wallet.id,
    type: 'wallet',
    network: wallet.network,
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKeyRef: wallet.privateKey ? 'encrypted' : undefined,
    balance: wallet.balance,
    unconfirmedBalance: wallet.unconfirmedBalance,
    utxoCount: wallet.utxoCount,
    status,
    createdAt: Date.now(),
    lastActivity: wallet.lastChecked || Date.now(),
    metadata: {
      path: wallet.path,
      derivationType: wallet.derivationType,
      accountIndex: wallet.accountIndex,
      addressIndex: wallet.addressIndex,
      source: wallet.source,
      symbol: wallet.symbol,
    },
  };
}

// ─── Update Master Ledger from DiscoveredWallets ─────────────────────────
export function updateMasterLedger(
  ledger: MasterLedger,
  wallets: DiscoveredWallet[],
  sources: RecoverySource[]
): MasterLedger {
  const entries: LedgerEntry[] = [];
  const totalBalance: Record<string, number> = {};
  const totalUnconfirmed: Record<string, number> = {};
  let activeKeys = 0;
  let emptyKeys = 0;
  let deadKeys = 0;

  // Convert all wallets to ledger entries
  for (const wallet of wallets) {
    const entry = walletToLedgerEntry(wallet);
    entries.push(entry);

    // Update totals
    if (!totalBalance[wallet.network]) {
      totalBalance[wallet.network] = 0;
      totalUnconfirmed[wallet.network] = 0;
    }
    totalBalance[wallet.network] += wallet.balance;
    totalUnconfirmed[wallet.network] += wallet.unconfirmedBalance;

    // Count keys by status
    if (entry.status === 'active') {
      activeKeys++;
    } else if (entry.status === 'empty') {
      emptyKeys++;
    } else if (entry.status === 'dead') {
      deadKeys++;
    }
  }

  // Build cross-chain summary
  const crossChainSummary = buildCrossChainSummary(wallets);

  return {
    entries,
    totalEntries: entries.length,
    totalBalance,
    totalUnconfirmed,
    activeKeys,
    emptyKeys,
    deadKeys,
    lastUpdated: Date.now(),
    crossChainSummary,
  };
}

// ─── Build Cross-Chain Summary ───────────────────────────────────────────
function buildCrossChainSummary(wallets: DiscoveredWallet[]): CrossChainSummary {
  const networks: Record<string, {
    confirmed: number;
    unconfirmed: number;
    utxoCount: number;
    addressCount: number;
    activeWallets: number;
  }> = {};

  for (const wallet of wallets) {
    if (!networks[wallet.network]) {
      networks[wallet.network] = {
        confirmed: 0,
        unconfirmed: 0,
        utxoCount: 0,
        addressCount: 0,
        activeWallets: 0,
      };
    }

    networks[wallet.network].confirmed += wallet.balance;
    networks[wallet.network].unconfirmed += wallet.unconfirmedBalance;
    networks[wallet.network].utxoCount += wallet.utxoCount;
    networks[wallet.network].addressCount++;
    
    if (wallet.balance > 0 || wallet.unconfirmedBalance > 0) {
      networks[wallet.network].activeWallets++;
    }
  }

  // Calculate recovery score (0-100)
  const totalAddresses = wallets.length;
  const activeAddresses = wallets.filter(w => w.balance > 0 || w.unconfirmedBalance > 0).length;
  const recoveryScore = totalAddresses > 0 ? Math.round((activeAddresses / totalAddresses) * 100) : 0;

  return {
    totalNetworks: Object.keys(networks).length,
    networks,
    aggregateValue: {},
    recoveryScore,
  };
}

// ─── Clean Dead/Empty Keys ───────────────────────────────────────────────
export function cleanDeadEmptyKeys(
  wallets: DiscoveredWallet[],
  options: { removeEmpty: boolean; removeDead: boolean; minBalance?: number } = { removeEmpty: true, removeDead: true }
): { cleaned: DiscoveredWallet[]; removed: number; kept: number } {
  const { removeEmpty, removeDead, minBalance = 0 } = options;
  
  const cleaned = wallets.filter(wallet => {
    const hasBalance = wallet.balance > minBalance || wallet.unconfirmedBalance > 0;
    const hasUTXOs = wallet.utxoCount > 0;
    const hasTransactions = wallet.transactions && wallet.transactions.length > 0;
    
    // Keep if has any value
    if (hasBalance || hasUTXOs || hasTransactions) {
      return true;
    }
    
    // Remove empty if flag set
    if (removeEmpty && wallet.balance === 0 && wallet.unconfirmedBalance === 0) {
      return false;
    }
    
    // Remove dead (no activity, no balance)
    if (removeDead && !hasBalance && !hasUTXOs) {
      return false;
    }
    
    // Keep by default
    return true;
  });

  return {
    cleaned,
    removed: wallets.length - cleaned.length,
    kept: cleaned.length,
  };
}

// ─── Cross-Chain Wallet Grouping ─────────────────────────────────────────
export function groupWalletsBySeed(
  wallets: DiscoveredWallet[]
): CrossChainWallet[] {
  // Group by source and derivation path pattern
  const groups: Record<string, DiscoveredWallet[]> = {};
  
  for (const wallet of wallets) {
    // Create a fingerprint from source and base path
    const fingerprint = `${wallet.source}:${wallet.derivationType}`;
    
    if (!groups[fingerprint]) {
      groups[fingerprint] = [];
    }
    groups[fingerprint].push(wallet);
  }

  // Convert to CrossChainWallet objects
  return Object.entries(groups).map(([fingerprint, groupWallets]) => {
    const addresses = groupWallets.map(w => ({
      network: w.network,
      address: w.address,
      path: w.path,
      balance: w.balance,
      unconfirmed: w.unconfirmedBalance,
      utxoCount: w.utxoCount,
    }));

    const totalConfirmed = addresses.reduce((sum, a) => sum + a.balance, 0);
    const totalUnconfirmed = addresses.reduce((sum, a) => sum + a.unconfirmed, 0);
    const totalUTXOs = addresses.reduce((sum, a) => sum + a.utxoCount, 0);
    const networksActive = [...new Set(groupWallets
      .filter(w => w.balance > 0 || w.unconfirmedBalance > 0)
      .map(w => {
        // Map network to coin type
        const networkMap: Record<string, number> = {
          'bitcoin': 0,
          'bitcoin-testnet': 1,
          'litecoin': 2,
          'dogecoin': 3,
          'dash': 5,
          'ethereum': 60,
          'ethereum-classic': 61,
          'bitcoin-cash': 145,
        };
        return networkMap[w.network] || 0;
      })
    )];

    return {
      seedFingerprint: fingerprint,
      addresses,
      totalConfirmed,
      totalUnconfirmed,
      totalUTXOs,
      networksActive,
    };
  });
}

// ─── Generate Recovery Report ────────────────────────────────────────────
export function generateRecoveryReport(
  wallets: DiscoveredWallet[],
  sources: RecoverySource[]
): RecoveryReport {
  const totalScanned = wallets.length;
  const totalFound = wallets.filter(w => w.balance > 0 || w.unconfirmedBalance > 0).length;
  const totalConfirmed = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalUnconfirmed = wallets.reduce((sum, w) => sum + w.unconfirmedBalance, 0);
  const totalUTXOs = wallets.reduce((sum, w) => sum + w.utxoCount, 0);
  const emptyAddresses = wallets.filter(w => w.balance === 0 && w.unconfirmedBalance === 0 && w.utxoCount === 0).length;
  const deadAddresses = wallets.filter(w => 
    w.balance === 0 && 
    w.unconfirmedBalance === 0 && 
    w.utxoCount === 0 && 
    (!w.transactions || w.transactions.length === 0)
  ).length;

  // Network breakdown
  const networkBreakdown: Record<string, {
    confirmed: number;
    unconfirmed: number;
    utxos: number;
    addresses: number;
  }> = {};

  for (const wallet of wallets) {
    if (!networkBreakdown[wallet.network]) {
      networkBreakdown[wallet.network] = {
        confirmed: 0,
        unconfirmed: 0,
        utxos: 0,
        addresses: 0,
      };
    }
    networkBreakdown[wallet.network].confirmed += wallet.balance;
    networkBreakdown[wallet.network].unconfirmed += wallet.unconfirmedBalance;
    networkBreakdown[wallet.network].utxos += wallet.utxoCount;
    networkBreakdown[wallet.network].addresses++;
  }

  // Cross-chain wallets
  const crossChainWallets = groupWalletsBySeed(wallets);

  // Recovery score
  const recoveryScore = totalScanned > 0 ? Math.round((totalFound / totalScanned) * 100) : 0;

  // Recommendations
  const recommendations: string[] = [];
  if (totalUnconfirmed > 0) {
    recommendations.push(`${totalUnconfirmed.toFixed(8)} BTC equivalent in unconfirmed transactions - monitor for confirmation`);
  }
  if (emptyAddresses > 0) {
    recommendations.push(`${emptyAddresses} empty addresses found - consider removing to clean up the pool`);
  }
  if (deadAddresses > 0) {
    recommendations.push(`${deadAddresses} dead addresses with no activity - safe to remove`);
  }
  if (totalUTXOs > 0) {
    recommendations.push(`${totalUTXOs} UTXOs tracked - ensure these are properly backed up`);
  }
  if (crossChainWallets.length > 0) {
    const multiChain = crossChainWallets.filter(w => w.networksActive.length > 1).length;
    if (multiChain > 0) {
      recommendations.push(`${multiChain} seed phrases have balances across multiple chains`);
    }
  }

  return {
    totalScanned,
    totalFound,
    totalConfirmed,
    totalUnconfirmed,
    totalUTXOs,
    emptyAddresses,
    deadAddresses,
    crossChainWallets,
    networkBreakdown,
    recoveryScore,
    recommendations,
  };
}

// ─── Calculate Cross-Chain Totals ────────────────────────────────────────
export function calculateCrossChainTotals(wallets: DiscoveredWallet[]): {
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUTXOs: number;
  byNetwork: Record<string, { confirmed: number; unconfirmed: number; utxos: number }>;
} {
  const byNetwork: Record<string, { confirmed: number; unconfirmed: number; utxos: number }> = {};
  let totalConfirmed = 0;
  let totalUnconfirmed = 0;
  let totalUTXOs = 0;

  for (const wallet of wallets) {
    if (!byNetwork[wallet.network]) {
      byNetwork[wallet.network] = { confirmed: 0, unconfirmed: 0, utxos: 0 };
    }
    
    byNetwork[wallet.network].confirmed += wallet.balance;
    byNetwork[wallet.network].unconfirmed += wallet.unconfirmedBalance;
    byNetwork[wallet.network].utxos += wallet.utxoCount;
    
    totalConfirmed += wallet.balance;
    totalUnconfirmed += wallet.unconfirmedBalance;
    totalUTXOs += wallet.utxoCount;
  }

  return {
    totalConfirmed,
    totalUnconfirmed,
    totalUTXOs,
    byNetwork,
  };
}
