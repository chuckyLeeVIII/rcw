import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

const mockTransactions = [
  {
    id: 'tx1',
    type: 'sent' as const,
    crypto: 'BTC',
    symbol: 'BTC',
    amount: '-0.00123',
    address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    shortAddress: 'bc1qxy...x0wlh',
    time: '2 hours ago',
    status: 'confirmed' as const,
    confirmations: 6,
    fee: '0.00001234',
  },
  {
    id: 'tx2',
    type: 'received' as const,
    crypto: 'ETH',
    symbol: 'ETH',
    amount: '+0.05',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
    shortAddress: '0x742d...2bD38',
    time: '5 hours ago',
    status: 'confirmed' as const,
    confirmations: 128,
    fee: '0.00042',
  },
  {
    id: 'tx3',
    type: 'sent' as const,
    crypto: 'DOGE',
    symbol: 'DOGE',
    amount: '-100.00',
    address: 'D8vFz1p5KqYqZ9x3hJmN7rT4wU2sV6bA8c',
    shortAddress: 'D8vFz1...bA8c',
    time: '1 day ago',
    status: 'confirmed' as const,
    confirmations: 1440,
    fee: '1.0',
  },
  {
    id: 'tx4',
    type: 'received' as const,
    crypto: 'LTC',
    symbol: 'LTC',
    amount: '+2.5',
    address: 'ltc1q8c6fshw2dlwun7ekn9qwf37cu2rn755upcp6el',
    shortAddress: 'ltc1q8c...cp6el',
    time: '2 days ago',
    status: 'confirmed' as const,
    confirmations: 2880,
    fee: '0.0001',
  },
  {
    id: 'tx5',
    type: 'sent' as const,
    crypto: 'ETH',
    symbol: 'ETH',
    amount: '-0.008',
    address: '0xdead00000000000000000000000000000000beef',
    shortAddress: '0xdead...beef',
    time: '3 days ago',
    status: 'confirmed' as const,
    confirmations: 512,
    fee: '0.00084',
  },
  {
    id: 'tx6',
    type: 'received' as const,
    crypto: 'BTC',
    symbol: 'BTC',
    amount: '+0.005',
    address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    shortAddress: '3J98t1...WNLy',
    time: '4 days ago',
    status: 'pending' as const,
    confirmations: 0,
    fee: '0.00002500',
  },
];

function getStatusBadge(status: 'confirmed' | 'pending') {
  if (status === 'confirmed') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-400">
        <CheckCircle2 className="w-3 h-3" />
        Confirmed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-yellow-400">
      <AlertCircle className="w-3 h-3" />
      Pending
    </span>
  );
}

export function TransactionHistory() {
  return (
    <div className="card-glass rounded-xl p-6 neon-border mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gradient flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Recent Transactions
        </h2>
        <Link
          to="/history"
          className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
        >
          View All History
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {mockTransactions.map((tx) => (
          <div
            key={tx.id}
            className="card-glass rounded-lg p-4 border border-gray-700/30 hover:border-cyan-500/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              {/* Left side: icon + details */}
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${tx.type === 'sent'
                      ? 'bg-red-500/10'
                      : 'bg-green-500/10'
                    }`}
                >
                  {tx.type === 'sent' ? (
                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-white">
                    {tx.type === 'sent' ? 'Sent' : 'Received'}{' '}
                    <span className="text-gray-400">{tx.crypto}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{tx.type === 'sent' ? 'To' : 'From'}: {tx.shortAddress}</span>
                    <ExternalLink className="w-3 h-3 cursor-pointer hover:text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Right side: amount + time */}
              <div className="text-right flex-shrink-0 ml-4">
                <div
                  className={`font-mono font-semibold ${tx.type === 'sent' ? 'text-red-400' : 'text-green-400'
                    }`}
                >
                  {tx.amount} {tx.symbol}
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-xs text-gray-500">{tx.time}</span>
                  {getStatusBadge(tx.status)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
