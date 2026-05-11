import React from 'react';
import {
  Wallet,
  Shield,
  Activity,
  History,
  ArrowUpRight,
  Plus,
  Coins,
  Globe,
  Zap
} from 'lucide-react';
import { QuickSendCard } from '../components/QuickSendCard';
import { BalanceCard } from '../components/BalanceCard';
import { TransactionHistory } from '../components/TransactionHistory';

export function HomePage() {
  return (
    <div className="space-y-6 lg:space-y-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          {/* Main Balance Card */}
          <div className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-cyan-500/10 to-transparent blur-2xl group-hover:opacity-75 transition-opacity" />
            <div className="relative card-glass p-8 rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-gray-400 text-sm font-medium mb-1 tracking-wider uppercase">Total Balance</p>
                  <h1 className="text-5xl font-bold text-gradient-purple flex items-baseline gap-2">
                    <span className="text-3xl text-purple-400">$</span>
                    42,584.20
                  </h1>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group/btn">
                    <Plus className="w-5 h-5 text-purple-400 group-hover/btn:rotate-90 transition-transform" />
                  </button>
                  <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">
                    <ArrowUpRight className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Growth', value: '+12.5%', icon: Activity, color: 'text-emerald-400' },
                  { label: 'Network', value: 'Optimized', icon: Zap, color: 'text-yellow-400' },
                  { label: 'Security', value: 'Military', icon: Shield, color: 'text-cyan-400' },
                  { label: 'Assets', value: '12 Active', icon: Coins, color: 'text-purple-400' },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <stat.icon className={`w-4 h-4 ${stat.color} mb-2`} />
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{stat.label}</p>
                    <p className="text-sm font-semibold text-gray-200">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Crypto Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BalanceCard chain="BTC" amount={1.24} value={34520.10} />
            <BalanceCard chain="ETH" amount={12.5} value={8064.10} />
          </div>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <QuickSendCard />
          <div className="card-glass p-6 rounded-3xl border border-white/10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Global Reach
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-sm text-gray-300">Active Bridges</span>
                <span className="text-xs font-mono text-cyan-400">8 Chains</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-sm text-gray-300">Protocol Status</span>
                <span className="text-xs font-mono text-emerald-400">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="card-glass p-8 rounded-3xl border border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            Live Activity
          </h2>
          <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium">View Detailed Report</button>
        </div>
        <TransactionHistory />
      </div>
    </div>
  );
}
