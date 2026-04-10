import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useAccount } from '../context/WalletContext';
import { cryptoList } from '../data/cryptoList';
import { checkBalancesBatch } from '../utils/balanceChecker';
import { NETWORKS } from '../config/app';

export function BalanceCard() {
  const { address, isConnected } = useAccount();
  const [searchTerm, setSearchTerm] = useState('');
  const [balances, setBalances] = useState<Map<string, { confirmed: number; unconfirmed: number; source: string }>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);

    const wallets = NETWORKS.map(net => ({
      id: net.id,
      network: net.name,
      address,
    }));

    try {
      const results = await checkBalancesBatch(wallets, 4, () => { });
      setBalances(results);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, fetchBalances]);

  const filteredCryptos = cryptoList.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const symbolToNetworkId: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'eth-mainnet', LTC: 'Litecoin', DOGE: 'Dogecoin',
    DASH: 'Dash', USDT: 'eth-mainnet', USDC: 'eth-mainnet', BNB: 'bsc',
    XRP: 'ethereum', ADA: 'ethereum', DOT: 'ethereum', AAVE: 'eth-mainnet',
    UNI: 'eth-mainnet', CAKE: 'bsc', SUSHI: 'eth-mainnet', CRV: 'eth-mainnet',
    SOL: 'ethereum', AVAX: 'avalanche', MATIC: 'polygon', OP: 'optimism',
    ARB: 'arbitrum', SHIB: 'eth-mainnet', PEPE: 'eth-mainnet', FLOKI: 'eth-mainnet',
    SAND: 'eth-mainnet', MANA: 'eth-mainnet', AXS: 'ethereum', LINK: 'eth-mainnet',
    GRT: 'eth-mainnet', FIL: 'ethereum', CRO: 'ethereum', FTT: 'eth-mainnet',
    KCS: 'ethereum', ATOM: 'ethereum', ALGO: 'ethereum', XLM: 'ethereum',
    VET: 'ethereum', NEAR: 'ethereum', FTM: 'ethereum', ONE: 'ethereum',
    HBAR: 'ethereum', ZIL: 'ethereum',
  };

  return (
    <div className="card-glass rounded-xl p-5 neon-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gradient">Portfolio Assets</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search assets..."
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-purple-500/50 outline-none w-48 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isConnected && (
            <button
              onClick={fetchBalances}
              disabled={loading}
              className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <span className="text-xs text-gray-400">Refresh</span>}
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {loading && balances.size === 0
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center p-3 rounded-lg animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-700/50 mr-3" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700/50 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-700/50 rounded w-12" />
              </div>
              <div className="h-4 bg-gray-700/50 rounded w-20" />
            </div>
          ))
          : filteredCryptos.map((crypto) => {
            const networkId = symbolToNetworkId[crypto.symbol] || 'eth-mainnet';
            const bal = balances.get(networkId);
            const balanceValue = bal ? bal.confirmed.toFixed(8) : isConnected ? '0.00000000' : '--';

            return (
              <div
                key={crypto.symbol}
                className="flex justify-between items-center p-3 rounded-lg transition-all duration-200 cursor-pointer group"
                style={{
                  background: 'rgba(31,41,55,0.3)',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(31,41,55,0.3)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" style={{
                      backgroundColor: '#8b5cf6',
                    }} />
                    <crypto.icon className="w-9 h-9 relative text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{crypto.symbol}</div>
                    <div className="text-xs text-gray-500">{crypto.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{balanceValue}</div>
                  {bal && <div className="text-xs text-gray-600 truncate max-w-[100px] ml-auto">{bal.source}</div>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
