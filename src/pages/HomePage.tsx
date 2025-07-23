import React from 'react';
import { useAccount } from 'wagmi';
import { BalanceCard } from '../components/BalanceCard';
import { QuickSendCard } from '../components/QuickSendCard';
import { TransactionHistory } from '../components/TransactionHistory';

export function HomePage() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      {isConnected ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BalanceCard />
          <QuickSendCard />
          <div className="lg:col-span-2">
            <TransactionHistory />
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6">
          <p>Please connect your wallet to view your dashboard.</p>
        </div>
      )}
    </div>
  );
}