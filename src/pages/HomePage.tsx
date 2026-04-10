import React, { useEffect, useState, useCallback } from 'react';
import { useAccount } from '../context/WalletContext';
import { BalanceCard } from '../components/BalanceCard';
import { QuickSendCard } from '../components/QuickSendCard';
import { TransactionHistory } from '../components/TransactionHistory';
import { TrendingUp, Shield, Zap, Wallet, ArrowUpRight, ArrowDownLeft, Coins, Loader2 } from 'lucide-react';
import { checkBalancesBatch } from '../utils/balanceChecker';
import { NETWORKS } from '../config/app';

export function HomePage() {
  const { address, isConnected } = useAccount();
  const [balances, setBalances] = useState<Map<string, { confirmed: number; unconfirmed: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [previousBalance, setPreviousBalance] = useState<number | null>(null);

  const totalBalance = Array.from(balances.values()).reduce((sum, b) => sum + b.confirmed + b.unconfirmed, 0);

  // Calculate 24h change from cached previous balance
  const previousBal = previousBalance;
  const change24h = previousBal !== null && previousBal > 0
    ? ((totalBalance - previousBal) / previousBal) * 100
    : null;
  const change24hAbsolute = previousBal !== null ? totalBalance - previousBal : null;

  const fetchBalances = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);

    // Save current total as previous before re-fetching
    if (balances.size > 0) {
      const currentTotal = Array.from(balances.values()).reduce((sum, b) => sum + b.confirmed + b.unconfirmed, 0);
      setPreviousBalance(currentTotal);
    }

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
  }, [isConnected, address, balances.size]);

  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [isConnected, address, fetchBalances]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {isConnected ? 'Real-time portfolio overview' : 'Connect your wallet to get started'}
          </p>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.1))',
          border: '1px solid rgba(139,92,246,0.15)',
        }}>
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300">{isConnected ? 'Portfolio Active' : 'Connect Wallet'}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-glass rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-6 h-6 rounded bg-gray-700/50" />
                  <div className="w-16 h-4 rounded-full bg-gray-700/50" />
                </div>
                <div className="h-8 bg-gray-700/50 rounded w-28 mt-1" />
                <div className="h-4 bg-gray-700/50 rounded w-20 mt-2" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
              label="Total Balance"
              value={isConnected ? formatUSD(totalBalance) : '--'}
              change={change24h !== null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : undefined}
              positive={change24h !== null ? change24h >= 0 : undefined}
            />
            <StatCard
              icon={<Coins className="w-6 h-6 text-blue-400" />}
              label="24h Change"
              value={isConnected
                ? (change24hAbsolute !== null ? `${change24hAbsolute >= 0 ? '+' : ''}$${change24hAbsolute.toFixed(2)}` : '$0.00')
                : '--'
              }
              change={change24h !== null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : undefined}
              positive={change24h !== null ? change24h >= 0 : undefined}
            />
            <StatCard
              icon={<ArrowUpRight className="w-6 h-6 text-purple-400" />}
              label="Sent (7d)"
              value="Connect wallet to see history"
              change=""
            />
            <StatCard
              icon={<ArrowDownLeft className="w-6 h-6 text-cyan-400" />}
              label="Received (7d)"
              value="Connect wallet to see history"
              change=""
            />
          </>
        )}
      </div>

      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BalanceCard />
          <QuickSendCard />
          <div className="lg:col-span-2">
            <TransactionHistory />
          </div>
        </div>
      ) : (
        <div className="card-glass rounded-xl p-12 text-center" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(6,182,212,0.05))',
          border: '1px dashed rgba(139,92,246,0.2)',
        }}>
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl animate-pulse-slow" />
            <Wallet className="w-20 h-20 text-purple-400 relative" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Connect your wallet to access your portfolio, send transactions, and manage your NFT collection.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, change, positive }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="card-glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        {icon}
        {change && change !== '' && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${positive === undefined ? 'text-gray-400 bg-gray-700/50' :
            positive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
            }`}>
            {change}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold mt-1 ${value.includes('Connect') ? 'text-sm text-gray-500 font-normal' : ''}`}>
        {value}
      </div>
      <div className="text-sm text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function formatUSD(balance: number): string {
  // Since we don't have real-time price feeds, show raw balance
  // In production you'd multiply by current prices
  return `$${balance.toFixed(2)}`;
}
