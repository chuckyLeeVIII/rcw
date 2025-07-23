import React from 'react';

interface CryptoBalanceProps {
  symbol: string;
  balance: string;
  name: string;
  change24h: string;
  priceUSD: string;
}

export function CryptoBalance({ symbol, balance, name, change24h, priceUSD }: CryptoBalanceProps) {
  const isPositiveChange = change24h.startsWith('+');
  
  return (
    <div className="flex justify-between items-center p-4 hover:bg-gray-700 rounded-lg transition-colors">
      <div className="flex items-center space-x-3">
        <div className="flex flex-col">
          <span className="font-medium">{symbol}</span>
          <span className="text-sm text-gray-400">{name}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono">{balance} {symbol}</div>
        <div className="text-sm flex items-center justify-end space-x-2">
          <span className="text-gray-400">${priceUSD}</span>
          <span className={isPositiveChange ? 'text-green-400' : 'text-red-400'}>
            {change24h}
          </span>
        </div>
      </div>
    </div>
  );
}