import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { cryptoList } from '../data/cryptoList';

export function BalanceCard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = {
    all: 'All Coins',
    major: 'Major Cryptocurrencies',
    altcoins: 'Popular Altcoins',
    defi: 'DeFi Tokens',
    layer: 'Layer 1 & 2',
    meme: 'Meme Coins',
    gaming: 'Gaming & Metaverse',
    infrastructure: 'Infrastructure',
    exchange: 'Exchange Tokens'
  };

  const filteredCryptos = cryptoList.filter(crypto =>
    (crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === 'all' || crypto.symbol === selectedCategory)
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Wallet Balance</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Object.entries(categories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <div className="relative">
            <input
              type="text"
              placeholder="Search coins..."
              className="bg-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
      </div>
      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {filteredCryptos.map((crypto) => (
          <div key={crypto.symbol} className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
            <div className="flex items-center">
              <crypto.icon className="w-8 h-8 text-blue-400 mr-3" />
              <div>
                <div className="flex items-center">
                  <span className="font-medium">{crypto.symbol}</span>
                  <span className="text-sm text-gray-400 ml-2">{crypto.name}</span>
                </div>
                <p className="text-sm text-gray-400">${crypto.price}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono">{crypto.balance}</div>
              <div className={`text-sm ${crypto.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                {crypto.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}