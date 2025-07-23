import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { cryptoList } from '../data/cryptoList';

export function QuickSendCard() {
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoList[0].symbol);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.ethereum) {
      alert('Please install a Web3 wallet like MetaMask');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get the current account
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const from = accounts[0];

      // Convert amount to Wei (multiply by 10^18)
      const amountWei = (Number(amount) * 1e18).toString(16);

      // Send transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: address,
          value: '0x' + amountWei,
          gas: '0x5208', // 21000 gas
        }],
      });

      alert(`Transaction sent! Hash: ${txHash}`);
      setAmount('');
      setAddress('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Quick Send</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Select Cryptocurrency</label>
          <select
            value={selectedCrypto}
            onChange={(e) => setSelectedCrypto(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {cryptoList.map((crypto) => (
              <option key={crypto.symbol} value={crypto.symbol}>
                {crypto.name} ({crypto.symbol})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Recipient Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder={`Enter ${selectedCrypto} address`}
            pattern="^0x[a-fA-F0-9]{40}$"
            title="Please enter a valid Ethereum address (0x...)"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 pr-16 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0.00000000"
              step="0.00000001"
              min="0"
              required
            />
            <span className="absolute right-3 top-2 text-gray-400">{selectedCrypto}</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send {selectedCrypto}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}