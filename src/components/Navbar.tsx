import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

export function Navbar() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');

  const handleConnect = async () => {
    try {
      const result = await window.ethereum?.request({ 
        method: 'eth_requestAccounts' 
      });
      if (result && result[0]) {
        setAddress(result[0]);
        setIsConnected(true);
      }
    } catch (error) {
      alert('Please install a Web3 wallet like MetaMask to connect');
    }
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Wallet className="w-8 h-8 text-blue-500" />
            <span className="ml-2 text-xl font-bold">PyGUI Wallet</span>
          </div>
          <div className="flex items-center space-x-4">
            {!isConnected ? (
              <button 
                onClick={handleConnect}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Connected:</span>
                <span className="font-mono text-sm">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}