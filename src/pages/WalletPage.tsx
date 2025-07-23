import React from 'react';
import { useAccount, useBalance } from 'wagmi';
import { cryptoList } from '../data/cryptoList';
import { WalletRecovery } from '../components/WalletRecovery';

export function WalletPage() {
  const { address, isConnected } = useAccount();
  const { data: ethBalance } = useBalance({
    address,
  });

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p>Please connect your wallet to view your balances.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Wallet</h1>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Connected Wallet</h2>
          <p className="font-mono text-gray-400">{address}</p>
          {ethBalance && (
            <p className="mt-2">
              Balance: {ethBalance.formatted} {ethBalance.symbol}
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cryptoList.map((crypto) => (
            <div key={crypto.symbol} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <crypto.icon className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="font-medium">{crypto.name}</h3>
                  <p className="text-sm text-gray-400">{crypto.symbol}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="font-mono">{crypto.balance}</p>
                <p className="text-sm text-gray-400">${crypto.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WalletRecovery />
    </div>
  );
}