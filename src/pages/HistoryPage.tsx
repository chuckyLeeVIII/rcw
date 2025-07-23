import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Search, ArrowUpRight, ArrowDownLeft, RefreshCw, Ban } from 'lucide-react';

export function HistoryPage() {
  const { address } = useAccount();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, confirmed
  const [timeRange, setTimeRange] = useState('all'); // all, day, week, month

  // Mock data - replace with real transaction fetching
  const transactions = [
    { 
      hash: '0x123...', 
      status: 'confirmed', 
      value: '1.5 ETH', 
      timestamp: '2024-02-20',
      to: '0x456...',
      from: '0x789...',
      gas: '21000',
      gasPrice: '50'
    },
    { 
      hash: '0x456...', 
      status: 'pending', 
      value: '0.5 ETH', 
      timestamp: '2024-02-19',
      to: '0xabc...',
      from: '0xdef...',
      gas: '21000',
      gasPrice: '45'
    }
  ];

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.from.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || tx.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transaction History</h1>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by transaction hash, address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 rounded-lg px-4 py-2"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-700 rounded-lg px-4 py-2"
          >
            <option value="all">All Time</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
        
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div key={tx.hash} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  {tx.status === 'confirmed' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-400 mr-3" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-yellow-400 mr-3" />
                  )}
                  <div>
                    <p className="font-mono">{tx.hash}</p>
                    <div className="text-sm text-gray-400 mt-1">
                      <p>From: {tx.from}</p>
                      <p>To: {tx.to}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono">{tx.value}</p>
                  <p className="text-sm text-gray-400">{tx.timestamp}</p>
                  <p className={`text-sm ${
                    tx.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {tx.status}
                  </p>
                </div>
              </div>
              
              {tx.status === 'pending' && (
                <div className="mt-4 flex space-x-4">
                  <button 
                    className="flex items-center bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                    onClick={() => {
                      // Implement speed up logic
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Speed Up
                  </button>
                  <button 
                    className="flex items-center bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
                    onClick={() => {
                      // Implement cancel logic
                    }}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-400">
                <p>Gas: {tx.gas} | Gas Price: {tx.gasPrice} Gwei</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}