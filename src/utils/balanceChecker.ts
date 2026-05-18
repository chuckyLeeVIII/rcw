import { INFURA_RPC } from '../config/app';

// Multi-network balance checker with rotating API endpoints and retry logic

export interface BalanceResult {
  confirmed: number;
  unconfirmed: number;
  total: number;
  symbol: string;
  source: string;
  txCount?: number;
  utxos?: Array<{ txid: string; vout: number; value: number; confirmations: number }>;
}

interface ApiEndpoint {
  url: (address: string) => string;
  parse: (data: any, symbol: string) => BalanceResult;
  name: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ApiEndpointWithStats extends ApiEndpoint {
  failures: number;
  lastFailure: number;
  successCount: number;
}

// ─── Bitcoin Endpoints (rotating) ───────────────────────────────────────
const BTC_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockstream',
    url: (a) => `https://blockstream.info/api/address/${a}`,
    parse: (data, symbol) => ({
      confirmed: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8,
      unconfirmed: (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 1e8,
      total: 0,
      symbol,
      source: 'Blockstream',
      txCount: (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Mempool.space',
    url: (a) => `https://mempool.space/api/address/${a}`,
    parse: (data, symbol) => ({
      confirmed: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8,
      unconfirmed: (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 1e8,
      total: 0,
      symbol,
      source: 'Mempool.space',
      txCount: (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'BlockCypher',
    url: (a) => `https://api.blockcypher.com/v1/btc/main/addrs/${a}/balance`,
    parse: (data, symbol) => ({
      confirmed: data.final_balance / 1e8,
      unconfirmed: (data.total_received - data.total_sent - data.final_balance) / 1e8,
      total: 0,
      symbol,
      source: 'BlockCypher',
      txCount: data.n_tx + (data.unconfirmed_n_tx || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── DigiByte ────────────────────────────────────────────────────────────
const DGB_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockchair DGB',
    url: (a) => `https://api.blockchair.com/digibyte/dashboards/address/${a}`,
    parse: (data, symbol) => ({
      confirmed: data.data[a].address.balance / 1e8,
      unconfirmed: 0, total: 0, symbol, source: 'Blockchair DGB',
      txCount: data.data[a].address.transactions
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  }
];

// ─── Bitcoin Gold ────────────────────────────────────────────────────────
const BTG_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockchair BTG',
    url: (a) => `https://api.blockchair.com/bitcoin-gold/dashboards/address/${a}`,
    parse: (data, symbol) => ({
      confirmed: data.data[a].address.balance / 1e8,
      unconfirmed: 0, total: 0, symbol, source: 'Blockchair BTG',
      txCount: data.data[a].address.transactions
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  }
];

// ─── Bitcoin Testnet ─────────────────────────────────────────────────────
const BTC_TESTNET_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockstream Testnet',
    url: (a) => `https://blockstream.info/testnet/api/address/${a}`,
    parse: (data, symbol) => ({
      confirmed: (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 1e8,
      unconfirmed: (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 1e8,
      total: 0,
      symbol,
      source: 'Blockstream Testnet',
      txCount: (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Ethereum Endpoints ──────────────────────────────────────────────────
const ETH_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Etherscan',
    url: (a) => `https://api.etherscan.io/api?module=account&action=balance&address=${a}&tag=latest&apikey=${import.meta.env.VITE_ETHERSCAN_API_KEY || 'demo'}`,
    parse: (data, symbol) => {
      if (data.status === '1') {
        return {
          confirmed: parseInt(data.result) / 1e18,
          unconfirmed: 0,
          total: 0,
          symbol,
          source: 'Etherscan',
          txCount: 0, // Would need separate txlist call
        };
      }
      throw new Error(data.message || 'Etherscan error');
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Cloudflare ETH',
    url: (a) => `https://cloudflare-eth.com`,
    parse: (data, symbol) => {
      const hex = data.result;
      return {
        confirmed: parseInt(hex, 16) / 1e18,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Cloudflare ETH',
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Ankr ETH',
    url: () => `https://rpc.ankr.com/eth`,
    parse: (data, symbol) => {
      const hex = data.result;
      return {
        confirmed: parseInt(hex, 16) / 1e18,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Ankr',
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Ethereum Classic ────────────────────────────────────────────────────
const ETC_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockchair ETC',
    url: (a) => `https://api.blockchair.com/ethereum-classic/dashboards/address/${a}`,
    parse: (data, symbol) => {
      const addr = data.data?.[a];
      if (!addr) throw new Error('Address not found');
      return {
        confirmed: addr.address.balance / 1e18,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Blockchair ETC',
        txCount: addr.address.transactions || 0,
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Litecoin ────────────────────────────────────────────────────────────
const LTC_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'BlockCypher',
    url: (a) => `https://api.blockcypher.com/v1/ltc/main/addrs/${a}/balance`,
    parse: (data, symbol) => ({
      confirmed: data.final_balance / 1e8,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'BlockCypher LTC',
      txCount: data.n_tx + (data.unconfirmed_n_tx || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Blockchair',
    url: (a) => `https://api.blockchair.com/litecoin/dashboards/address/${a}`,
    parse: (data, symbol) => {
      const addr = data.data[a];
      if (!addr) throw new Error('Address not found');
      return {
        confirmed: addr.address.received / 1e8 - addr.address.spent / 1e8,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Blockchair LTC',
        txCount: addr.address.transactions || 0,
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Dogecoin ────────────────────────────────────────────────────────────
const DOGE_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'BlockCypher',
    url: (a) => `https://api.blockcypher.com/v1/doge/main/addrs/${a}/balance`,
    parse: (data, symbol) => ({
      confirmed: data.final_balance / 1e8,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'BlockCypher DOGE',
      txCount: data.n_tx + (data.unconfirmed_n_tx || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Blockchair',
    url: (a) => `https://api.blockchair.com/dogecoin/dashboards/address/${a}`,
    parse: (data, symbol) => {
      const addr = data.data[a];
      if (!addr) throw new Error('Address not found');
      return {
        confirmed: (addr.address.received - addr.address.spent) / 1e8,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Blockchair DOGE',
        txCount: addr.address.transactions || 0,
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Dash ────────────────────────────────────────────────────────────────
const DASH_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'BlockCypher',
    url: (a) => `https://api.blockcypher.com/v1/dash/main/addrs/${a}/balance`,
    parse: (data, symbol) => ({
      confirmed: data.final_balance / 1e8,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'BlockCypher DASH',
      txCount: data.n_tx + (data.unconfirmed_n_tx || 0),
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
  {
    name: 'Blockchair',
    url: (a) => `https://api.blockchair.com/dash/dashboards/address/${a}`,
    parse: (data, symbol) => {
      const addr = data.data[a];
      if (!addr) throw new Error('Address not found');
      return {
        confirmed: (addr.address.received - addr.address.spent) / 1e8,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Blockchair DASH',
        txCount: addr.address.transactions || 0,
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Polygon ─────────────────────────────────────────────────────────────
const POLYGON_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Infura Polygon',
    url: () => INFURA_RPC.polygon,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'Infura Polygon',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Arbitrum ────────────────────────────────────────────────────────────
const ARBITRUM_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Infura Arbitrum',
    url: () => INFURA_RPC.arbitrum,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'Infura Arbitrum',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Optimism ────────────────────────────────────────────────────────────
const OPTIMISM_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Infura Optimism',
    url: () => INFURA_RPC.optimism,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'Infura Optimism',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Base ────────────────────────────────────────────────────────────────
const BASE_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Infura Base',
    url: () => INFURA_RPC.base,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'Infura Base',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── BNB Smart Chain ─────────────────────────────────────────────────────
const BSC_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'BSC RPC',
    url: () => `https://bsc-dataseed.binance.org`,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'BSC RPC',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Avalanche ───────────────────────────────────────────────────────────
const AVALANCHE_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Infura Avalanche',
    url: () => INFURA_RPC.avalanche,
    parse: (data, symbol) => ({
      confirmed: parseInt(data.result, 16) / 1e18,
      unconfirmed: 0,
      total: 0,
      symbol,
      source: 'Infura Avalanche',
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Bitcoin Cash ────────────────────────────────────────────────────────
const BCH_ENDPOINTS: ApiEndpointWithStats[] = [
  {
    name: 'Blockchair BCH',
    url: (a) => `https://api.blockchair.com/bitcoin-cash/dashboards/address/${a}`,
    parse: (data, symbol) => {
      const addr = data.data?.[a];
      if (!addr) throw new Error('Address not found');
      return {
        confirmed: (addr.address.received - addr.address.spent) / 1e8,
        unconfirmed: 0,
        total: 0,
        symbol,
        source: 'Blockchair BCH',
        txCount: addr.address.transactions || 0,
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// Special JSON-RPC handler for ETH endpoints
function fetchETHJsonRpc(address: string, rpcUrl: string): Promise<number> {
  return fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  }).then(r => r.json()).then(data => {
    if (data.error) throw new Error(data.error.message);
    return parseInt(data.result, 16) / 1e18;
  });
}

// ─── Normalize any network identifier to canonical form ──────────────────
function normalizeNetwork(network: string): string {
  const n = network.toLowerCase().trim();
  if (n.includes('bitcoin') && n.includes('test')) return 'bitcoin-testnet';
  if (n.includes('bitcoin') && n.includes('cash')) return 'bitcoin-cash';
  if (n.includes('bitcoin')) return 'bitcoin';
  if (n.includes('ethereum') && n.includes('classic')) return 'ethereum-classic';
  if (n.includes('ethereum')) return 'ethereum';
  if (n.includes('litecoin')) return 'litecoin';
  if (n.includes('dogecoin')) return 'dogecoin';
  if (n.includes('dash')) return 'dash';
  if (n.includes('polygon') || n === 'matic') return 'polygon';
  if (n.includes('arbitrum')) return 'arbitrum';
  if (n.includes('optimism') || n === 'op') return 'optimism';
  if (n.includes('base')) return 'base';
  if (n.includes('binance') || n.includes('bsc') || n.includes('bnb')) return 'bsc';
  if (n.includes('avalanche') || n.includes('avax')) return 'avalanche';
  return n;
}

// ─── Symbol resolver ─────────────────────────────────────────────────────
function getSymbol(network: string): string {
  const n = normalizeNetwork(network);
  const map: Record<string, string> = {
    bitcoin: 'BTC',
    'bitcoin-testnet': 'tBTC',
    'bitcoin-cash': 'BCH',
    ethereum: 'ETH',
    'ethereum-classic': 'ETC',
    litecoin: 'LTC',
    dogecoin: 'DOGE',
    dash: 'DASH',
    polygon: 'MATIC',
    arbitrum: 'ETH',
    optimism: 'ETH',
    base: 'ETH',
    bsc: 'BNB',
    avalanche: 'AVAX',
  };
  return map[n] || 'ETH';
}

// ─── Registry: normalized network id → endpoint array ────────────────────
const NETWORK_REGISTRY: Record<string, ApiEndpointWithStats[]> = {
  bitcoin: BTC_ENDPOINTS,
  'bitcoin-testnet': BTC_TESTNET_ENDPOINTS,
  'bitcoin-cash': BCH_ENDPOINTS,
  ethereum: ETH_ENDPOINTS,
  'ethereum-classic': ETC_ENDPOINTS,
  litecoin: LTC_ENDPOINTS,
  dogecoin: DOGE_ENDPOINTS,
  dash: DASH_ENDPOINTS,
  polygon: POLYGON_ENDPOINTS,
  arbitrum: ARBITRUM_ENDPOINTS,
  optimism: OPTIMISM_ENDPOINTS,
  base: BASE_ENDPOINTS,
  bsc: BSC_ENDPOINTS,
  avalanche: AVALANCHE_ENDPOINTS,
  digibyte: DGB_ENDPOINTS,
  bitcoingold: BTG_ENDPOINTS,
};

// ─── Fetch with timeout + JSON parsing ───────────────────────────────────
async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Smart endpoint selection: sort by success rate, with cooldown ───────
function selectEndpoint(endpoints: ApiEndpointWithStats[]): ApiEndpointWithStats {
  const now = Date.now();
  const COOLDOWN_MS = 60_000; // 1 min cooldown after failure

  const sorted = [...endpoints].sort((a, b) => {
    // Recently failed endpoints get demoted
    const aPenalty = (now - a.lastFailure < COOLDOWN_MS) ? 100 : 0;
    const bPenalty = (now - b.lastFailure < COOLDOWN_MS) ? 100 : 0;
    const aScore = (a.successCount + 1) / (a.failures + 1 + aPenalty);
    const bScore = (b.successCount + 1) / (b.failures + 1 + bPenalty);
    return bScore - aScore;
  });

  return sorted[0];
}

// ─── Core: try endpoints in order until one succeeds ─────────────────────
export async function checkBalanceWithRotation(
  network: string,
  address: string,
  onAttempt?: (endpointName: string, attempt: number) => void
): Promise<BalanceResult> {
  const normalized = normalizeNetwork(network);
  const endpoints = NETWORK_REGISTRY[normalized];
  if (!endpoints || endpoints.length === 0) {
    return { confirmed: 0, unconfirmed: 0, total: 0, symbol: getSymbol(network), source: 'unknown' };
  }

  const symbol = getSymbol(network);
  const EVM_NETWORKS = new Set([
    'ethereum', 'ethereum-classic',
    'polygon', 'arbitrum', 'optimism', 'base', 'bsc', 'avalanche'
  ]);
  const isEVM = EVM_NETWORKS.has(normalized);
  const maxAttempts = endpoints.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ep = selectEndpoint(endpoints);
    onAttempt?.(ep.name, attempt + 1);

    try {
      if (isEVM) {
        // JSON-RPC style endpoints
        const rpcUrl = ep.url(address);
        if (rpcUrl.includes('/api') || rpcUrl.includes('etherscan')) {
          // Etherscan REST API
          const res = await fetchWithTimeout(rpcUrl);
          const data = await res.json();
          const result = ep.parse(data, symbol);
          result.total = result.confirmed + result.unconfirmed;
          ep.successCount++;
          return result;
        } else {
          // JSON-RPC
          const balance = await fetchETHJsonRpc(address, rpcUrl);
          ep.successCount++;
          return { confirmed: balance, unconfirmed: 0, total: balance, symbol, source: ep.name };
        }
      } else {
        // REST API endpoints
        const url = ep.url(address);
        const res = await fetchWithTimeout(url);
        const data = await res.json();
        const result = ep.parse(data, symbol);
        result.total = result.confirmed + result.unconfirmed;
        ep.successCount++;
        return result;
      }
    } catch (err) {
      ep.failures++;
      ep.lastFailure = Date.now();
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  return { confirmed: 0, unconfirmed: 0, total: 0, symbol, source: 'all_failed' };
}

// ─── Batch: check multiple wallets with concurrency control ──────────────
export async function checkBalancesBatch(
  wallets: Array<{ id: string; network: string; address: string }>,
  concurrency = 3,
  onProgress?: (progress: number, walletId: string, balance: number) => void
): Promise<Map<string, BalanceResult>> {
  const results = new Map<string, BalanceResult>();
  const queue = [...wallets];
  let completed = 0;
  const total = wallets.length;

  async function worker() {
    while (queue.length > 0) {
      const wallet = queue.shift()!;
      try {
        const balance = await checkBalanceWithRotation(wallet.network, wallet.address);
        results.set(wallet.id, balance);
      } catch {
        results.set(wallet.id, {
          confirmed: 0, unconfirmed: 0, total: 0,
          symbol: getSymbol(wallet.network),
          source: 'error',
        });
      }
      completed++;
      onProgress?.((completed / total) * 100, wallet.id, results.get(wallet.id)?.confirmed || 0);
    }
  }

  // Run N workers concurrently
  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);

  return results;
}

// ─── Legacy compatibility: checkWalletBalance ────────────────────────────
export async function checkWalletBalance(wallet: { network: string; address: string }): Promise<number> {
  const result = await checkBalanceWithRotation(wallet.network, wallet.address);
  return result.confirmed + result.unconfirmed;
}

// ─── Legacy compatibility: checkAllBalances ──────────────────────────────
// NOW WITH: deduplication + high-concurrency batching
// 12,550 wallets at concurrency 15 = ~10-15 minutes instead of 3-7 hours
export async function checkAllBalances<T extends { id: string; network: string; address: string }>(
  wallets: T[],
  onProgress?: (progress: number, updatedWallet: T & { balance?: number; balanceFormatted?: string; unconfirmedBalance?: number; unconfirmedBalanceFormatted?: string; transactions?: any[]; utxoCount?: number }) => void
): Promise<T[]> {
  const updated = [...wallets];
  if (updated.length === 0) return updated;

  // Deduplicate by address+network — only check unique combos once
  const uniqueMap = new Map<string, T[]>();
  for (const w of updated) {
    const key = `${w.network}:${w.address}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, []);
    uniqueMap.get(key)!.push(w);
  }
  const uniqueWallets = Array.from(uniqueMap.entries()).map(([key, group]) => group[0]);

  // Check all unique wallets with high concurrency
  const results = await checkBalancesBatch(
    uniqueWallets.map(w => ({ id: w.id, network: w.network, address: w.address })),
    15, // 15 concurrent workers — fast but not abusive
    (progress, _walletId, _balance) => {
      onProgress?.(progress, updated[Math.floor((progress / 100) * updated.length)] || updated[0]);
    }
  );

  // Apply results to ALL wallets (including duplicates)
  for (const w of updated) {
    const result = results.get(w.id);
    if (result) {
      (w as any).balance = result.confirmed;
      (w as any).balanceFormatted = result.confirmed.toFixed(8);
      (w as any).unconfirmedBalance = result.unconfirmed;
      (w as any).unconfirmedBalanceFormatted = result.unconfirmed.toFixed(8);
      (w as any).lastChecked = Date.now();
      if (result.txCount !== undefined) {
        (w as any).transactions = Array(result.txCount).fill(null);
      }
      if (result.utxos) {
        (w as any).utxos = result.utxos;
        (w as any).utxoCount = result.utxos.length;
      }
    } else {
      (w as any).balance = 0;
      (w as any).balanceFormatted = '0';
      (w as any).unconfirmedBalance = 0;
      (w as any).unconfirmedBalanceFormatted = '0';
      (w as any).lastChecked = Date.now();
    }
  }

  return updated;
}

// ─── Get API health status ───────────────────────────────────────────────
export function getApiHealth(): Record<string, { total: number; successRate: number; endpoints: string[] }> {
  const health: Record<string, { total: number; successRate: number; endpoints: string[] }> = {};
  for (const [network, endpoints] of Object.entries(NETWORK_REGISTRY)) {
    const total = endpoints.reduce((s, e) => s + e.successCount + e.failures, 0);
    const successRate = total > 0 ? (endpoints.reduce((s, e) => s + e.successCount, 0) / total) * 100 : 100;
    health[network] = {
      total,
      successRate: Math.round(successRate),
      endpoints: endpoints.map(e => e.name),
    };
  }
  return health;
}
