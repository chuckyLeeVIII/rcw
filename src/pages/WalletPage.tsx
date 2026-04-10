import React, { useEffect, useState, useCallback } from 'react';
import { useAccount } from '../context/WalletContext';
import { cryptoList } from '../data/cryptoList';
import { WalletRecovery } from '../components/WalletRecovery';
import { Wallet, Copy, ExternalLink, Shield, RefreshCw, Loader2 } from 'lucide-react';
import { checkBalancesBatch, getApiHealth } from '../utils/balanceChecker';
import { NETWORKS } from '../config/app';

export function WalletPage() {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<Map<string, { confirmed: number; unconfirmed: number; source: string }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [apiHealth, setApiHealth] = useState<ReturnType<typeof getApiHealth>>({});

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);

    // Build wallet list: each supported network mapped to this address
    const wallets = NETWORKS.map(net => ({
      id: net.id,
      network: net.name,
      address,
    }));

    try {
      const results = await checkBalancesBatch(wallets, 4, () => { });
      const balanceMap = new Map<string, { confirmed: number; unconfirmed: number; source: string }>();
      results.forEach((result, networkId) => {
        balanceMap.set(networkId, {
          confirmed: result.confirmed,
          unconfirmed: result.unconfirmed,
          source: result.source,
        });
      });
      setBalances(balanceMap);
      setLastFetched(new Date());
    } catch {
      // keep existing balances, just mark not loading
    } finally {
      setLoading(false);
      setApiHealth(getApiHealth());
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, fetchBalances]);

  if (!isConnected) {
    return (
      <div className="card-glass rounded-xl p-12 text-center" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(6,182,212,0.05))',
        border: '1px dashed rgba(139,92,246,0.2)',
      }}>
        <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium mb-2">Connect Your Wallet</h3>
        <p className="text-gray-400">Please connect your wallet to view your balances.</p>
      </div>
    );
  }

  // Helper to look up balance for a given network
  const getBalanceForNetwork = (networkId: string) => {
    return balances.get(networkId);
  };

  // Map crypto symbols to network IDs for display
  const symbolToNetworkId: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'eth-mainnet',
    LTC: 'Litecoin',
    DOGE: 'Dogecoin',
    DASH: 'Dash',
    USDT: 'eth-mainnet',
    USDC: 'eth-mainnet',
    BNB: 'bsc',
    XRP: 'ethereum',
    ADA: 'ethereum',
    DOT: 'ethereum',
    AAVE: 'eth-mainnet',
    UNI: 'eth-mainnet',
    CAKE: 'bsc',
    SUSHI: 'eth-mainnet',
    CRV: 'eth-mainnet',
    SOL: 'ethereum',
    AVAX: 'avalanche',
    MATIC: 'polygon',
    OP: 'optimism',
    ARB: 'arbitrum',
    SHIB: 'eth-mainnet',
    PEPE: 'eth-mainnet',
    FLOKI: 'eth-mainnet',
    SAND: 'eth-mainnet',
    MANA: 'eth-mainnet',
    AXS: 'ethereum',
    LINK: 'eth-mainnet',
    GRT: 'eth-mainnet',
    FIL: 'ethereum',
    CRO: 'ethereum',
    FTT: 'eth-mainnet',
    KCS: 'ethereum',
    ATOM: 'ethereum',
    ALGO: 'ethereum',
    XLM: 'ethereum',
    VET: 'ethereum',
    NEAR: 'ethereum',
    FTM: 'ethereum',
    ONE: 'ethereum',
    HBAR: 'ethereum',
    ZIL: 'ethereum',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gradient">Wallet</h1>
        <button
          onClick={fetchBalances}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all disabled:opacity-40 text-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{loading ? 'Fetching...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Wallet Header */}
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl" />
              <Wallet className="w-12 h-12 text-purple-400 relative" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Connected Wallet</h2>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-sm font-mono text-gray-400">{address}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(address)}
                  className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg" style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))',
            border: '1px solid rgba(16,185,129,0.2)',
          }}>
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400">Verified</span>
          </div>
        </div>
      </div>

      {/* Last fetched info + API health */}
      {lastFetched && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>Last updated: {lastFetched.toLocaleTimeString()}</span>
          {Object.keys(apiHealth).length > 0 && (
            <div className="flex items-center space-x-3">
              <span>Providers:</span>
              {Object.entries(apiHealth).slice(0, 3).map(([net, info]) => (
                <span key={net} className="px-2 py-0.5 rounded bg-gray-800/50">
                  {net}: {info.endpoints.join(', ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && balances.size === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-glass rounded-xl p-4 animate-pulse">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700/50" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700/50 rounded w-20 mb-1" />
                  <div className="h-3 bg-gray-700/50 rounded w-12" />
                </div>
              </div>
              <div className="h-4 bg-gray-700/50 rounded w-24 mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Asset Grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cryptoList.map((crypto) => {
            const networkId = symbolToNetworkId[crypto.symbol] || 'eth-mainnet';
            const bal = getBalanceForNetwork(networkId);
            const balanceValue = bal ? bal.confirmed.toFixed(8) : '0.00000000';
            const source = bal?.source || 'pending';

            return (
              <div
                key={crypto.symbol}
                className="card-glass rounded-xl p-4 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="absolute inset-0 blur-sm opacity-0 group-hover:opacity-100 transition-opacity bg-purple-500/30 rounded-full" />
                      <crypto.icon className="w-10 h-10 relative text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{crypto.name}</h3>
                      <p className="text-xs text-gray-500">{crypto.symbol}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}>
                  <p className="font-mono text-sm">{balanceValue}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">Source: {source}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <WalletRecovery />
    </div>
  );
}
