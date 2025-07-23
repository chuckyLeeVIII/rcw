import React, { useState } from 'react';
import { useAccount, usePrepareSendTransaction, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { cryptoList } from '../data/cryptoList';

export function SendPage() {
  const { isConnected } = useAccount();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState(cryptoList[0].symbol);
  const [gasPrice, setGasPrice] = useState('');
  const [memo, setMemo] = useState('');
  const [rbfEnabled, setRbfEnabled] = useState(false);

  const { config } = usePrepareSendTransaction({
    to,
    value: amount ? parseEther(amount) : undefined,
  });

  const { sendTransaction } = useSendTransaction(config);

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p>Please connect your wallet to send transactions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Send Transaction</h1>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          sendTransaction?.();
        }}>
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Cryptocurrency
            </label>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
            >
              {cryptoList.map((crypto) => (
                <option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.name} ({crypto.symbol})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="0x..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 pr-20"
                placeholder="0.0"
                step="0.000000000000000001"
              />
              <span className="absolute right-4 top-2 text-gray-400">
                {selectedCrypto}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Gas Price (Gwei)
            </label>
            <input
              type="number"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Auto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Enter memo or note"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rbf"
              checked={rbfEnabled}
              onChange={(e) => setRbfEnabled(e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <label htmlFor="rbf" className="ml-2 text-sm">
              Enable Replace-by-Fee (RBF)
            </label>
          </div>
          
          <button
            type="submit"
            disabled={!sendTransaction}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
          >
            Send Transaction
          </button>
        </form>
      </div>
    </div>
  );
}