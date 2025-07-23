import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const recentTransactions = [
  { type: 'sent', crypto: 'BTC', amount: '-0.00123', address: '3FZbgi29...', time: '2 hours ago' },
  { type: 'received', crypto: 'ETH', amount: '+0.05', address: '0x1234...', time: '5 hours ago' },
  { type: 'sent', crypto: 'DOGE', amount: '-100.00', address: 'D8vFz1...', time: '1 day ago' },
];

export function TransactionHistory() {
  return (
    <div className="mt-8 bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
      <div className="space-y-4">
        {recentTransactions.map((tx, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center">
              {tx.type === 'sent' ? (
                <ArrowUpRight className="w-5 h-5 text-red-400 mr-3" />
              ) : (
                <ArrowDownLeft className="w-5 h-5 text-green-400 mr-3" />
              )}
              <div>
                <div className="font-medium">{tx.type === 'sent' ? 'Sent' : 'Received'} {tx.crypto}</div>
                <div className="text-sm text-gray-400">
                  {tx.type === 'sent' ? 'To: ' : 'From: '}{tx.address}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-mono ${tx.type === 'sent' ? 'text-red-400' : 'text-green-400'}`}>
                {tx.amount} {tx.crypto}
              </div>
              <div className="text-sm text-gray-400">{tx.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}