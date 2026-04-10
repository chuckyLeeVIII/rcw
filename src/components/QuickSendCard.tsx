import React, { useState, useEffect, useCallback } from 'react';
import { Send, Zap, ArrowUpRight, Loader2 } from 'lucide-react';
import { useAccount } from '../context/WalletContext';
import { checkBalanceWithRotation } from '../utils/balanceChecker';
import { NETWORKS } from '../config/app';

const SENDABLE_ASSETS = [
  { symbol: 'ETH', name: 'Ethereum', networkId: 'eth-mainnet', decimals: 18 },
  { symbol: 'MATIC', name: 'Polygon', networkId: 'polygon', decimals: 18 },
  { symbol: 'BNB', name: 'BNB Smart Chain', networkId: 'bsc', decimals: 18 },
  { symbol: 'AVAX', name: 'Avalanche', networkId: 'avalanche', decimals: 18 },
];

export function QuickSendCard() {
  const { address, isConnected } = useAccount();
  const [selectedAsset, setSelectedAsset] = useState(SENDABLE_ASSETS[0]);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    try {
      const network = NETWORKS.find(n => n.id === selectedAsset.networkId);
      if (network) {
        const result = await checkBalanceWithRotation(network.name, address);
        setBalance(result.confirmed);
      }
    } catch {
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  }, [isConnected, address, selectedAsset.networkId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const setMax = () => {
    if (balance !== null && balance > 0) {
      setAmount(balance.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !amount || !recipient || balance === null) return;

    try {
      setIsSending(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const from = accounts[0];

      // Switch to the correct network if needed
      const network = NETWORKS.find(n => n.id === selectedAsset.networkId);
      if (network && network.chainId !== 1) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${network.chainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          // Chain not added to wallet
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                rpcUrls: [network.rpc],
                nativeCurrency: { name: network.symbol, symbol: network.symbol, decimals: 18 },
                blockExplorerUrls: [network.explorer],
              }],
            });
          }
        }
      }

      const amountWei = '0x' + (BigInt(Math.floor(Number(amount) * 10 ** selectedAsset.decimals))).toString(16);
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from, to: recipient, value: amountWei }],
      });
      alert(`Transaction sent! Hash: ${txHash}`);
      setAmount('');
      setRecipient('');
      // Refresh balance after send
      fetchBalance();
    } catch (error: any) {
      alert(error.message || 'Transaction failed');
    } finally {
      setIsSending(false);
    }
  };

  const currentBalanceDisplay = balanceLoading
    ? '...'
    : balance !== null
      ? `${balance.toFixed(6)} ${selectedAsset.symbol}`
      : isConnected
        ? '0.000000'
        : 'Connect wallet';

  return (
    <div className="card-glass rounded-xl p-5 neon-border">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Send className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-gradient-green">Quick Send</h2>
        </div>
        <div className="text-xs text-gray-500">On-Chain Transfer</div>
      </div>

      {/* Balance display */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700/30 flex items-center justify-between">
        <span className="text-xs text-gray-400">Available Balance</span>
        <div className="flex items-center space-x-2">
          {balanceLoading && <Loader2 className="w-3 h-3 animate-spin text-gray-500" />}
          <span className="text-sm font-mono text-gray-300">{currentBalanceDisplay}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Asset</label>
          <div className="grid grid-cols-4 gap-2">
            {SENDABLE_ASSETS.map((asset) => (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => setSelectedAsset(asset)}
                className={`p-2 rounded-lg transition-all text-sm text-center ${selectedAsset.symbol === asset.symbol
                  ? 'ring-1 ring-purple-500 bg-purple-500/10'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
                  }`}
              >
                <span className="text-purple-400 font-medium">{asset.symbol}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none transition-colors font-mono"
            placeholder="0x..."
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Amount ({selectedAsset.symbol})</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none transition-colors pr-20"
              placeholder="0.00"
              step="0.00000001"
              min="0"
              max={balance ?? undefined}
              required
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <button
                type="button"
                onClick={setMax}
                disabled={balance === null || balance <= 0}
                className="text-[10px] text-purple-400 hover:text-purple-300 font-medium px-2 py-0.5 rounded bg-purple-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                MAX
              </button>
              <span className="text-xs text-gray-500">{selectedAsset.symbol}</span>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="text-xs text-center text-gray-500 py-2">
            Connect your wallet to send transactions
          </div>
        )}

        <button
          type="submit"
          disabled={isSending || !isConnected || !recipient || !amount || (balance !== null && Number(amount) > balance)}
          className="w-full btn-neon px-4 py-3 rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-40 font-medium"
        >
          {isSending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Send {selectedAsset.symbol}</span>
              <ArrowUpRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
