// Cross-Chain Calculation Utilities
// Provides cross-chain recovery, balance aggregation, and verification

import {
  DiscoveredWallet,
  CrossChainWallet,
  RecoveryReport,
  UTXOEntry,
} from '../types/recoveryPool';
import { checkBalanceWithRotation, BalanceResult } from './balanceChecker';

// ─── Network Configuration ───────────────────────────────────────────────
export interface NetworkConfig {
  id: string;
  name: string;
  symbol: string;
  coinType: number;
  isUTXO: boolean;
  decimals: number;
  bip44Purpose: number;
}

export const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  bitcoin: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', coinType: 0, isUTXO: true, decimals: 8, bip44Purpose: 44 },
  'bitcoin-testnet': { id: 'bitcoin-testnet', name: 'Bitcoin Testnet', symbol: 'tBTC', coinType: 1, isUTXO: true, decimals: 8, bip44Purpose: 44 },
  litecoin: { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', coinType: 2, isUTXO: true, decimals: 8, bip44Purpose: 44 },
  dogecoin: { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', coinType: 3, isUTXO: true, decimals: 8, bip44Purpose: 44 },
  dash: { id: 'dash', name: 'Dash', symbol: 'DASH', coinType: 5, isUTXO: true, decimals: 8, bip44Purpose: 44 },
  ethereum: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', coinType: 60, isUTXO: false, decimals: 18, bip44Purpose: 44 },
  'ethereum-classic': { id: 'ethereum-classic', name: 'Ethereum Classic', symbol: 'ETC', coinType: 61, isUTXO: false, decimals: 18, bip44Purpose: 44 },
  'bitcoin-cash': { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', coinType: 145, isUTXO: true, decimals: 8, bip44Purpose: 44 },
};

// ─── Cross-Chain Balance Verification ────────────────────────────────────
export async function verifyCrossChainBalances(
  wallets: DiscoveredWallet[],
  onProgress?: (progress: number, walletId: string, result: BalanceResult) => void
): Promise<DiscoveredWallet[]> {
  const updated = [...wallets];
  const total = updated.length;

  for (let i = 0; i < updated.length; i++) {
    const wallet = updated[i];
    try {
      const balance = await checkBalanceWithRotation(wallet.network, wallet.address);
      
      updated[i] = {
        ...wallet,
        balance: balance.confirmed,
        unconfirmedBalance: balance.unconfirmed,
        balanceFormatted: balance.confirmed.toFixed(8),
        unconfirmedBalanceFormatted: balance.unconfirmed.toFixed(8),
        lastChecked: Date.now(),
      };

      onProgress?.(((i + 1) / total) * 100, wallet.id, balance);
    } catch (err) {
      console.error(`Failed to verify balance for ${wallet.address}:`, err);
      updated[i] = {
        ...wallet,
        lastChecked: Date.now(),
      };
      onProgress?.(((i + 1) / total) * 100, wallet.id, { 
        confirmed: 0, 
        unconfirmed: 0, 
        total: 0, 
        symbol: wallet.symbol, 
        source: 'error' 
      });
    }
  }

  return updated;
}

// ─── Cross-Chain UTXO Aggregation ────────────────────────────────────────
export function aggregateUTXOs(wallets: DiscoveredWallet[]): {
  totalUTXOs: number;
  totalValue: number;
  byNetwork: Record<string, { count: number; value: number; entries: UTXOEntry[] }>;
  unconfirmedUTXOs: UTXOEntry[];
} {
  const result = {
    totalUTXOs: 0,
    totalValue: 0,
    byNetwork: {} as Record<string, { count: number; value: number; entries: UTXOEntry[] }>,
    unconfirmedUTXOs: [] as UTXOEntry[],
  };

  for (const wallet of wallets) {
    if (!wallet.utxos || wallet.utxos.length === 0) continue;

    if (!result.byNetwork[wallet.network]) {
      result.byNetwork[wallet.network] = { count: 0, value: 0, entries: [] };
    }

    for (const utxo of wallet.utxos) {
      result.totalUTXOs++;
      result.totalValue += utxo.value;
      result.byNetwork[wallet.network].count++;
      result.byNetwork[wallet.network].value += utxo.value;
      result.byNetwork[wallet.network].entries.push(utxo);

      // Track unconfirmed UTXOs (0 confirmations)
      if (utxo.confirmations === 0) {
        result.unconfirmedUTXOs.push(utxo);
      }
    }
  }

  return result;
}

// ─── Cross-Chain Recovery Score ──────────────────────────────────────────
export function calculateRecoveryScore(wallets: DiscoveredWallet[]): {
  score: number;
  totalAddresses: number;
  activeAddresses: number;
  emptyAddresses: number;
  deadAddresses: number;
  totalConfirmed: number;
  totalUnconfirmed: number;
  totalUTXOs: number;
  breakdown: Record<string, { score: number; active: number; total: number }>;
} {
  const totalAddresses = wallets.length;
  let activeAddresses = 0;
  let emptyAddresses = 0;
  let deadAddresses = 0;
  let totalConfirmed = 0;
  let totalUnconfirmed = 0;
  let totalUTXOs = 0;

  const breakdown: Record<string, { score: number; active: number; total: number }> = {};

  for (const wallet of wallets) {
    const hasBalance = wallet.balance > 0 || wallet.unconfirmedBalance > 0;
    const hasUTXOs = wallet.utxoCount > 0;
    const hasActivity = hasBalance || hasUTXOs;

    totalConfirmed += wallet.balance;
    totalUnconfirmed += wallet.unconfirmedBalance;
    totalUTXOs += wallet.utxoCount;

    if (hasActivity) {
      activeAddresses++;
    } else if (!hasBalance && !hasUTXOs && (!wallet.transactions || wallet.transactions.length === 0)) {
      deadAddresses++;
    } else {
      emptyAddresses++;
    }

    // Network breakdown
    if (!breakdown[wallet.network]) {
      breakdown[wallet.network] = { score: 0, active: 0, total: 0 };
    }
    breakdown[wallet.network].total++;
    if (hasActivity) {
      breakdown[wallet.network].active++;
    }
  }

  // Calculate scores
  for (const [network, data] of Object.entries(breakdown)) {
    breakdown[network].score = data.total > 0 ? Math.round((data.active / data.total) * 100) : 0;
  }

  const score = totalAddresses > 0 ? Math.round((activeAddresses / totalAddresses) * 100) : 0;

  return {
    score,
    totalAddresses,
    activeAddresses,
    emptyAddresses,
    deadAddresses,
    totalConfirmed,
    totalUnconfirmed,
    totalUTXOs,
    breakdown,
  };
}

// ─── Cross-Chain Wallet Linking ──────────────────────────────────────────
export function linkCrossChainWallets(
  wallets: DiscoveredWallet[],
  groupBy: 'source' | 'derivationType' | 'accountIndex' = 'source'
): CrossChainWallet[] {
  const groups: Record<string, DiscoveredWallet[]> = {};

  for (const wallet of wallets) {
    let key: string;
    switch (groupBy) {
      case 'source':
        key = wallet.source;
        break;
      case 'derivationType':
        key = wallet.derivationType;
        break;
      case 'accountIndex':
        key = `${wallet.source}-${wallet.accountIndex}`;
        break;
      default:
        key = wallet.source;
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(wallet);
  }

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
    
    const networksActive = [...new Set(
      groupWallets
        .filter(w => w.balance > 0 || w.unconfirmedBalance > 0)
        .map(w => {
          const config = NETWORK_CONFIGS[w.network];
          return config ? config.coinType : 0;
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

// ─── Normalize Balance to Common Unit (USD-like approximation) ───────────
// Note: This is a simplified version. In production, you'd use real price feeds.
export function normalizeBalances(wallets: DiscoveredWallet[]): Record<string, number> {
  // Simplified normalization - in production use actual price oracle
  const approximateWeights: Record<string, number> = {
    bitcoin: 1.0,
    'bitcoin-testnet': 0, // testnet has no real value
    litecoin: 0.002,
    dogecoin: 0.0001,
    dash: 0.003,
    ethereum: 0.05,
    'ethereum-classic': 0.002,
    'bitcoin-cash': 0.004,
  };

  const normalized: Record<string, number> = {};

  for (const wallet of wallets) {
    if (!normalized[wallet.network]) {
      normalized[wallet.network] = 0;
    }
    
    const weight = approximateWeights[wallet.network] || 0;
    normalized[wallet.network] += (wallet.balance + wallet.unconfirmedBalance) * weight;
  }

  return normalized;
}

// ─── Detect Stale/Dead Addresses ─────────────────────────────────────────
export function detectStaleAddresses(
  wallets: DiscoveredWallet[],
  options: { staleThresholdMs?: number; checkUTXOs?: boolean } = {}
): { stale: DiscoveredWallet[]; dead: DiscoveredWallet[]; active: DiscoveredWallet[] } {
  const { staleThresholdMs = 90 * 24 * 60 * 60 * 1000, checkUTXOs = true } = options; // 90 days default
  
  const stale: DiscoveredWallet[] = [];
  const dead: DiscoveredWallet[] = [];
  const active: DiscoveredWallet[] = [];

  const now = Date.now();

  for (const wallet of wallets) {
    const hasBalance = wallet.balance > 0 || wallet.unconfirmedBalance > 0;
    const hasUTXOs = checkUTXOs && wallet.utxoCount > 0;
    const hasTransactions = wallet.transactions && wallet.transactions.length > 0;
    const recentlyChecked = wallet.lastChecked && (now - wallet.lastChecked) < staleThresholdMs;

    const isActive = hasBalance || hasUTXOs || hasTransactions;
    const isStale = !recentlyChecked && !isActive;
    const isDead = !isActive && !hasTransactions && wallet.utxoCount === 0;

    if (isDead) {
      dead.push(wallet);
    } else if (isStale) {
      stale.push(wallet);
    } else {
      active.push(wallet);
    }
  }

  return { stale, dead, active };
}

// ─── Generate Recovery Recommendations ───────────────────────────────────
export function generateRecommendations(wallets: DiscoveredWallet[]): string[] {
  const recommendations: string[] = [];
  
  const { stale, dead, active } = detectStaleAddresses(wallets);
  const utxoAgg = aggregateUTXOs(wallets);
  const score = calculateRecoveryScore(wallets);

  if (score.totalUnconfirmed > 0) {
    recommendations.push(
      `⏳ ${score.totalUnconfirmed.toFixed(8)} in unconfirmed balances across networks - monitor for confirmations`
    );
  }

  if (dead.length > 0) {
    recommendations.push(
      `🗑️ ${dead.length} dead addresses detected with no balance or activity - consider cleaning`
    );
  }

  if (stale.length > 0) {
    recommendations.push(
      `⚠️ ${stale.length} stale addresses not checked recently - refresh balances`
    );
  }

  if (utxoAgg.unconfirmedUTXOs.length > 0) {
    recommendations.push(
      `📊 ${utxoAgg.unconfirmedUTXOs.length} unconfirmed UTXOs pending - track for confirmation`
    );
  }

  if (score.score < 50 && score.totalAddresses > 10) {
    recommendations.push(
      `📈 Recovery score is ${score.score}% - consider scanning more derivation paths or sources`
    );
  }

  const multiChainWallets = linkCrossChainWallets(wallets).filter(w => w.networksActive.length > 1);
  if (multiChainWallets.length > 0) {
    recommendations.push(
      `🔗 ${multiChainWallets.length} seed phrases have activity across multiple chains - ensure proper backup`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All wallets are healthy and up-to-date');
  }

  return recommendations;
}
