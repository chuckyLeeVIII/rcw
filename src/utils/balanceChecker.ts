// Multi-network balance checker with rotating API endpoints and retry logic

export interface BalanceResult {
  confirmed: number;
  unconfirmed: number;
  total: number;
  symbol: string;
  source: string;
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
    }),
    failures: 0, lastFailure: 0, successCount: 0,
  },
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
      };
    },
    failures: 0, lastFailure: 0, successCount: 0,
  },
];

// ─── Registry: network name → endpoint array ────────────────────────────
const NETWORK_REGISTRY: Record<string, ApiEndpointWithStats[]> = {
  bitcoin: BTC_ENDPOINTS,
  'Bitcoin': BTC_ENDPOINTS,
  'bitcoin-testnet': BTC_TESTNET_ENDPOINTS,
  ethereum: ETH_ENDPOINTS,
  Ethereum: ETH_ENDPOINTS,
  litecoin: LTC_ENDPOINTS,
  Litecoin: LTC_ENDPOINTS,
  dogecoin: DOGE_ENDPOINTS,
  Dogecoin: DOGE_ENDPOINTS,
  dash: DASH_ENDPOINTS,
  Dash: DASH_ENDPOINTS,
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
  const endpoints = NETWORK_REGISTRY[network];
  if (!endpoints || endpoints.length === 0) {
    return { confirmed: 0, unconfirmed: 0, total: 0, symbol: '?', source: 'unknown' };
  }

  // Get symbol from first endpoint parse (fallback)
  const symbol = network === 'ethereum' || network === 'Ethereum' ? 'ETH' :
    network === 'litecoin' || network === 'Litecoin' ? 'LTC' :
      network === 'dogecoin' || network === 'Dogecoin' ? 'DOGE' :
        network === 'dash' || network === 'Dash' ? 'DASH' :
          'BTC';

  const maxAttempts = endpoints.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const ep = selectEndpoint(endpoints);
    onAttempt?.(ep.name, attempt + 1);

    try {
      if (network === 'ethereum' || network === 'Ethereum') {
        // JSON-RPC style endpoints
        const rpcUrl = ep.url(address);
        if (rpcUrl.includes('/api') || rpcUrl.includes('etherscan')) {
          // Etherscan REST API
          const res = await fetchWithTimeout(rpcUrl);
          const data = await res.json();
          const result = ep.parse(data, symbol);
          ep.successCount++;
          return result;
        } else {
          // JSON-RPC
          const balance = await fetchETHJsonRpc(address, rpcUrl);
          ep.successCount++;
          return { confirmed: balance, unconfirmed: 0, total: 0, symbol, source: ep.name };
        }
      } else {
        // REST API endpoints
        const url = ep.url(address);
        const res = await fetchWithTimeout(url);
        const data = await res.json();
        const result = ep.parse(data, symbol);
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
          symbol: wallet.network === 'ethereum' ? 'ETH' : 'BTC',
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
export async function checkAllBalances<T extends { id: string; network: string; address: string }>(
  wallets: T[],
  onProgress?: (progress: number, updatedWallet: T & { balance?: number; balanceFormatted?: string; unconfirmedBalance?: number; unconfirmedBalanceFormatted?: string }) => void
): Promise<T[]> {
  const updated = [...wallets];

  for (let i = 0; i < updated.length; i++) {
    try {
      const result = await checkBalanceWithRotation(updated[i].network, updated[i].address);
      (updated[i] as any).balance = result.confirmed;
      (updated[i] as any).balanceFormatted = result.confirmed.toFixed(8);
      (updated[i] as any).unconfirmedBalance = result.unconfirmed;
      (updated[i] as any).unconfirmedBalanceFormatted = result.unconfirmed.toFixed(8);
      (updated[i] as any).lastChecked = Date.now();
    } catch {
      (updated[i] as any).balance = 0;
      (updated[i] as any).balanceFormatted = '0';
      (updated[i] as any).unconfirmedBalance = 0;
      (updated[i] as any).unconfirmedBalanceFormatted = '0';
      (updated[i] as any).lastChecked = Date.now();
    }
    onProgress?.(((i + 1) / updated.length) * 100, updated[i]);
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
