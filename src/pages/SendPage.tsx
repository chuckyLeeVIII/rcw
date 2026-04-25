import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAccount } from '../context/WalletContext';
import { cryptoList } from '../data/cryptoList';
import { checkBalanceWithRotation } from '../utils/balanceChecker';
import {
  DEV_FEES,
  DEV_FEE_ADDRESS,
  NETWORKS,
  calcDevFee,
  getExplorerUrl,
} from '../config/app';
import { ethers } from 'ethers';
import {
  Send,
  Wallet,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowUpRight,
  Fuel,
  Tag,
  Coins,
  ExternalLink,
  Info,
} from 'lucide-react';

// Map crypto symbols to EVM network IDs for on-chain sends
const SYMBOL_TO_NETWORK_ID: Record<string, string> = {
  ETH: 'eth-sepolia',
  MATIC: 'polygon',
  BNB: 'bsc',
  AVAX: 'avalanche',
  OP: 'optimism',
  ARB: 'arbitrum',
  USDT: 'eth-sepolia',
  USDC: 'eth-sepolia',
};

// Native coin symbols (send via direct ETH tx, not ERC-20)
const NATIVE_COINS = new Set(['ETH', 'MATIC', 'BNB', 'AVAX', 'OP', 'ARB']);

function Toast({
  type,
  message,
  isVisible,
  onClose,
}: {
  type: 'success' | 'error' | 'info';
  message: string;
  isVisible: boolean;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 6000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const borderMap = {
    success: 'border-green-500/50 shadow-green-500/20',
    error: 'border-red-500/50 shadow-red-500/20',
    info: 'border-cyan-500/50 shadow-cyan-500/20',
  };
  const textMap = {
    success: 'text-green-300',
    error: 'text-red-300',
    info: 'text-cyan-300',
  };
  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />,
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`card-glass rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg ${borderMap[type]}`}
      >
        {iconMap[type]}
        <p className={`text-sm ${textMap[type]}`}>{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">
          x
        </button>
      </div>
    </div>
  );
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  to,
  amount,
  selectedCrypto,
  devFeeAmount,
  netAmount,
  estimatedGas,
  totalCost,
  gasPriceGwei,
  cryptoIcon: CryptoIcon,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  to: string;
  amount: string;
  selectedCrypto: string;
  devFeeAmount: string;
  netAmount: string;
  estimatedGas: string;
  totalCost: string;
  gasPriceGwei: string;
  cryptoIcon: React.ElementType;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="card-glass neon-border rounded-2xl p-6 max-w-md w-full relative z-10">
        <h3 className="text-gradient-green text-lg font-semibold mb-4 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5" />
          Confirm Transaction
        </h3>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Sending
            </span>
            <span className="text-white font-medium flex items-center gap-2">
              <CryptoIcon className="w-4 h-4 text-cyan-400" />
              {amount} {selectedCrypto}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400">To</span>
            <span className="text-white font-mono text-sm">{to.slice(0, 6)}...{to.slice(-4)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400 flex items-center gap-2">
              <Coins className="w-4 h-4" /> Dev Fee (2%)
            </span>
            <span className="text-yellow-400 font-medium">{devFeeAmount} {selectedCrypto}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Net to Recipient
            </span>
            <span className="text-green-400 font-medium">{netAmount} {selectedCrypto}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400 flex items-center gap-2">
              <Fuel className="w-4 h-4" /> Est. Gas
            </span>
            <span className="text-yellow-400 font-medium">{estimatedGas} {selectedCrypto}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span className="text-gray-400">Gas Price</span>
            <span className="text-gray-300 font-mono text-sm">{gasPriceGwei} Gwei</span>
          </div>
          <div className="flex items-center justify-between py-2 pt-3 border-t border-gray-600/50">
            <span className="text-white font-semibold">Total Cost</span>
            <span className="text-gradient-green font-mono font-bold">{totalCost} {selectedCrypto}</span>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-xs">
            This will send {netAmount} {selectedCrypto} to the recipient and {devFeeAmount} {selectedCrypto} to the dev fee wallet. Total: {totalCost} {selectedCrypto}.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn-neon flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Confirm &amp; Send
          </button>
        </div>
      </div>
    </div>
  );
}

export function SendPage() {
  const { address, isConnected } = useAccount();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('ETH');
  const [gasPriceGwei, setGasPriceGwei] = useState('');
  const [memo, setMemo] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txExplorerUrl, setTxExplorerUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [liveGasPrice, setLiveGasPrice] = useState<number>(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string; visible: boolean }>({
    type: 'success',
    message: '',
    visible: false,
  });

  const selectedCryptoData = useMemo(
    () => cryptoList.find((c) => c.symbol === selectedCrypto) || cryptoList[0],
    [selectedCrypto]
  );

  const CryptoIcon = selectedCryptoData.icon;

  const devFeeAmount = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return calcDevFee(amt, 'TRANSFER');
  }, [amount]);

  const netAmount = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return amt - devFeeAmount;
  }, [amount, devFeeAmount]);

  const gasEth = useMemo(() => {
    if (!gasEstimate) return '0';
    const gas = parseFloat(gasEstimate);
    const gwei = liveGasPrice > 0 ? liveGasPrice : 21;
    return (gas * gwei).toString();
  }, [gasEstimate, liveGasPrice]);

  const totalCost = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const gasVal = parseFloat(gasEth) / 1e18;
    return (amt + gasVal).toFixed(8);
  }, [amount, gasEth]);

  // Fetch real balance when address/crypto changes
  useEffect(() => {
    if (!isConnected || !address) return;

    const networkKey = SYMBOL_TO_NETWORK_ID[selectedCrypto];
    if (!networkKey) {
      setBalance(0);
      return;
    }

    setBalanceLoading(true);
    checkBalanceWithRotation(networkKey, address)
      .then((result) => {
        setBalance(result.confirmed + result.unconfirmed);
      })
      .catch(() => {
        setBalance(0);
      })
      .finally(() => {
        setBalanceLoading(false);
      });
  }, [isConnected, address, selectedCrypto]);

  // Fetch live gas price
  useEffect(() => {
    if (!isConnected) return;

    const fetchGasPrice = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) {
          setLiveGasPrice(parseFloat(ethers.utils.formatUnits(feeData.gasPrice, 'gwei')));
        }
      } catch {
        // fallback to default
      }
    };

    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 15000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Estimate gas for the transaction
  useEffect(() => {
    if (!isConnected || !address || !to) {
      setGasEstimate(null);
      return;
    }

    setGasLoading(true);
    const estimate = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const isNative = NATIVE_COINS.has(selectedCrypto);

        if (isNative) {
          // For native coin, estimate is standard 21000 gas
          const gasLimit = 21000;
          setGasEstimate(gasLimit.toString());
        } else {
          // For ERC-20 tokens, estimate transfer gas
          // We need the token contract to estimate properly, use standard estimate
          const gasLimit = 65000;
          setGasEstimate(gasLimit.toString());
        }
      } catch {
        setGasEstimate(null);
      } finally {
        setGasLoading(false);
      }
    };

    estimate();
  }, [isConnected, address, to, selectedCrypto]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleMaxAmount = useCallback(() => {
    if (balance <= 0) return;
    // Max = balance minus estimated gas cost
    const gwei = liveGasPrice > 0 ? liveGasPrice : 21;
    const gas = parseFloat(gasEstimate || '21000');
    const gasCostEth = (gas * gwei) / 1e9;
    const maxVal = Math.max(0, balance - gasCostEth - 0.0001); // small buffer
    setAmount(maxVal.toFixed(8));
  }, [balance, liveGasPrice, gasEstimate]);

  const isFormValid = useMemo(
    () => {
      if (!to || !amount || parseFloat(amount) <= 0) return false;
      // Validate address format for EVM chains
      if (selectedCrypto in SYMBOL_TO_NETWORK_ID) {
        try {
          ethers.utils.getAddress(to);
        } catch {
          return false;
        }
      }
      return true;
    },
    [to, amount, selectedCrypto]
  );

  const hasSufficientBalance = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const gasVal = parseFloat(gasEth) / 1e18;
    return balance >= amt + gasVal;
  }, [amount, balance, gasEth]);

  const devFeeWarning = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const fee = calcDevFee(amt, 'TRANSFER');
    const gwei = liveGasPrice > 0 ? liveGasPrice : 21;
    const gas = parseFloat(gasEstimate || '21000');
    const gasCostEth = (gas * gwei) / 1e9;
    // If amount is so small that gas cost exceeds it
    if (amt > 0 && gasCostEth >= amt) {
      return `Amount too small: estimated gas (${gasCostEth.toFixed(6)} ${selectedCrypto}) exceeds send amount.`;
    }
    if (fee < 0.000001 && amt > 0) {
      return `Dev fee is very small (${fee.toFixed(8)} ${selectedCrypto}). Consider sending more.`;
    }
    return null;
  }, [amount, liveGasPrice, gasEstimate, selectedCrypto]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid) return;

      if (!hasSufficientBalance) {
        showToast('error', `Insufficient balance. You have ${balance.toFixed(8)} ${selectedCrypto}.`);
        return;
      }

      if (devFeeWarning && devFeeWarning.includes('too small')) {
        showToast('error', devFeeWarning);
        return;
      }

      setShowConfirmation(true);
    },
    [isFormValid, hasSufficientBalance, balance, selectedCrypto, devFeeWarning, showToast]
  );

  const handleConfirmSend = useCallback(async () => {
    setShowConfirmation(false);
    setIsSending(true);
    setTxHash(null);
    setTxExplorerUrl(null);

    try {
      if (!window.ethereum) {
        showToast('error', 'No injected wallet found. Please install MetaMask.');
        setIsSending(false);
        return;
      }

      if (!address) {
        showToast('error', 'Wallet not connected.');
        setIsSending(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const network = await provider.getNetwork();

      const isNative = NATIVE_COINS.has(selectedCrypto);
      const networkId = SYMBOL_TO_NETWORK_ID[selectedCrypto];
      const networkConfig = NETWORKS.find((n) => n.id === networkId);

      // Check if we're on the right chain
      if (networkConfig && network.chainId !== networkConfig.chainId) {
        showToast(
          'error',
          `Wrong network. Please switch to ${networkConfig.name} (Chain ID: ${networkConfig.chainId}).`
        );
        setIsSending(false);
        return;
      }

      const amtFloat = parseFloat(amount);
      const feeFloat = devFeeAmount;
      const netFloat = netAmount;

      if (isNative) {
        // Send native coin: two transactions
        // 1. Send netAmount to recipient
        // 2. Send devFee to dev wallet

        const netWei = ethers.utils.parseEther(netFloat.toFixed(18));
        const feeWei = ethers.utils.parseEther(feeFloat.toFixed(18));

        // Check balance covers both transfers + gas
        const bal = await signer.getBalance();
        const gasLimit = 21000;
        const feeData = await provider.getFeeData();
        const gasPrice = gasPriceGwei
          ? ethers.utils.parseUnits(gasPriceGwei, 'gwei')
          : feeData.gasPrice || ethers.utils.parseUnits('21', 'gwei');
        const totalGasCost = gasPrice.mul(gasLimit * 2); // two txs
        const totalNeeded = netWei.add(feeWei).add(totalGasCost);

        if (bal.lt(totalNeeded)) {
          showToast(
            'error',
            `Insufficient balance. Need ${ethers.utils.formatEther(totalNeeded)} ${selectedCrypto}, have ${ethers.utils.formatEther(bal)}.`
          );
          setIsSending(false);
          return;
        }

        // Transaction 1: Send to recipient
        const tx1 = await signer.sendTransaction({
          to: ethers.utils.getAddress(to),
          value: netWei,
          gasLimit: 21000,
          ...(gasPriceGwei ? { gasPrice } : {}),
        });

        showToast('info', `Recipient tx sent: ${tx1.hash.slice(0, 10)}... Waiting for confirmation.`);

        // Transaction 2: Send dev fee
        const tx2 = await signer.sendTransaction({
          to: DEV_FEE_ADDRESS,
          value: feeWei,
          gasLimit: 21000,
          ...(gasPriceGwei ? { gasPrice } : {}),
        });

        showToast('info', `Dev fee tx sent: ${tx2.hash.slice(0, 10)}...`);

        // Wait for both to confirm
        await tx1.wait();
        await tx2.wait();

        // Show the recipient tx as the main result
        const explorerUrl = networkConfig
          ? getExplorerUrl(networkConfig.id, tx1.hash)
          : `https://etherscan.io/tx/${tx1.hash}`;

        setTxHash(`${tx1.hash} (recipient) | ${tx2.hash} (dev fee)`);
        setTxExplorerUrl(explorerUrl);
        showToast('success', `Transaction confirmed! Sent ${netFloat.toFixed(8)} ${selectedCrypto} to recipient.`);

        // Refresh balance
        if (networkId) {
          checkBalanceWithRotation(networkId, address).then((result) => {
            setBalance(result.confirmed + result.unconfirmed);
          });
        }
      } else {
        // For ERC-20 tokens, we'd need the token contract ABI and address
        // This is a simplified placeholder showing the flow
        showToast(
          'error',
          `${selectedCrypto} token transfers require the token contract address. Native sends only for now.`
        );
        setIsSending(false);
        return;
      }

      setTo('');
      setAmount('');
      setGasPriceGwei('');
      setMemo('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('user rejected')) {
        showToast('error', 'Transaction rejected by user.');
      } else if (message.includes('insufficient funds')) {
        showToast('error', 'Insufficient funds for gas.');
      } else {
        showToast('error', `Transaction failed: ${message}`);
      }
    } finally {
      setIsSending(false);
    }
  }, [
    address,
    amount,
    to,
    selectedCrypto,
    devFeeAmount,
    netAmount,
    gasPriceGwei,
    showToast,
  ]);

  if (!isConnected) {
    return (
      <div className="card-glass neon-border rounded-2xl p-6 text-center">
        <Wallet className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-gray-300">Please connect your wallet to send transactions.</p>
      </div>
    );
  }

  // Only allow EVM-compatible coins for on-chain sends
  const evmCoins = cryptoList.filter((c) => SYMBOL_TO_NETWORK_ID[c.symbol]);

  return (
    <div className="space-y-6">
      <Toast type={toast.type} message={toast.message} isVisible={toast.visible} onClose={hideToast} />

      <h1 className="text-gradient text-3xl font-bold flex items-center gap-3">
        <Send className="w-8 h-8 text-cyan-400" />
        Send Transaction
      </h1>

      {/* Dev Fee Info Banner */}
      <div className="bg-gray-800/40 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-300 text-sm font-medium">2% Dev Fee Applied</p>
          <p className="text-gray-400 text-xs mt-1">
            Every transfer deducts a {((DEV_FEES.TRANSFER) * 100).toFixed(0)}% fee sent to the dev wallet.
            Recipient receives the net amount after fee.
          </p>
        </div>
      </div>

      <div className="card-glass neon-border rounded-2xl p-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Crypto Selector - EVM only */}
          <div>
            <label className="text-gradient-green block text-sm font-medium mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Select Cryptocurrency
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-2">
              {evmCoins.slice(0, 8).map((crypto) => {
                const Icon = crypto.icon;
                const isSelected = crypto.symbol === selectedCrypto;
                return (
                  <button
                    key={crypto.symbol}
                    type="button"
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${isSelected
                        ? 'bg-gray-700/80 border-cyan-500/60 shadow-md shadow-cyan-500/10'
                        : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                      }`}
                    title={`${crypto.name} (${crypto.symbol})`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {crypto.symbol}
                    </span>
                  </button>
                );
              })}
            </div>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors"
            >
              {evmCoins.map((crypto) => (
                <option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.name} ({crypto.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Balance Display - Real */}
          <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Balance
            </span>
            {balanceLoading ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            ) : (
              <span className="text-white font-mono font-medium">
                {balance.toFixed(8)}{' '}
                <span className="text-cyan-400 text-sm">{selectedCrypto}</span>
              </span>
            )}
          </div>

          {/* Recipient Address */}
          <div>
            <label className="text-gradient-green block text-sm font-medium mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${to.length > 0
                  ? 'border-green-500/50 focus:ring-green-500/30 focus:border-green-500/50'
                  : 'border-gray-700/50 focus:ring-cyan-500/30 focus:border-cyan-500/50'
                }`}
              placeholder="0x..."
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-gradient-green block text-sm font-medium mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2.5 pr-32 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${amount.length > 0 && parseFloat(amount) > 0
                    ? 'border-green-500/50 focus:ring-green-500/30 focus:border-green-500/50'
                    : 'border-gray-700/50 focus:ring-cyan-500/30 focus:border-cyan-500/50'
                  }`}
                placeholder="0.0"
                step="0.000000000000000001"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMaxAmount}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-400/10 hover:bg-cyan-400/20 px-2 py-1 rounded transition-colors"
                >
                  MAX
                </button>
                <span className="text-gray-400 text-sm flex items-center gap-1">
                  <CryptoIcon className="w-3 h-3" />
                  {selectedCrypto}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-gray-800/40 border border-cyan-500/20 rounded-lg p-4 space-y-2">
              <p className="text-gradient-green text-sm font-semibold mb-2">Fee Breakdown</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-mono">{parseFloat(amount).toFixed(8)} {selectedCrypto}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Dev Fee ({(DEV_FEES.TRANSFER * 100).toFixed(0)}%)
                </span>
                <span className="text-yellow-400 font-mono">{devFeeAmount.toFixed(8)} {selectedCrypto}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> Recipient Gets
                </span>
                <span className="text-green-400 font-mono">{netAmount.toFixed(8)} {selectedCrypto}</span>
              </div>
              <div className="border-t border-gray-700/50 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <Fuel className="w-3 h-3" /> Est. Gas
                </span>
                {gasLoading ? (
                  <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                ) : (
                  <span className="text-yellow-400 font-mono">
                    {gasEstimate ? `${(parseFloat(gasEstimate) * (liveGasPrice || 21) / 1e9).toFixed(8)}` : '—'} {selectedCrypto}
                    {liveGasPrice > 0 && (
                      <span className="text-gray-500 text-xs ml-1">(@ {(liveGasPrice).toFixed(1)} Gwei)</span>
                    )}
                  </span>
                )}
              </div>
              {devFeeWarning && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs">{devFeeWarning}</p>
                </div>
              )}
              {!hasSufficientBalance && parseFloat(amount) > 0 && (
                <div className="flex items-start gap-2 mt-2">
                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-xs">
                    Insufficient balance. Need {totalCost} {selectedCrypto}, have {balance.toFixed(8)}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Gas Price */}
          <div>
            <label className="text-gradient-green block text-sm font-medium mb-2 flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Gas Price (Gwei)
            </label>
            <div className="relative">
              <input
                type="number"
                value={gasPriceGwei}
                onChange={(e) => setGasPriceGwei(e.target.value)}
                className={`w-full bg-gray-800/50 border rounded-lg px-4 py-2.5 pr-24 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${gasPriceGwei.length > 0
                    ? 'border-green-500/50 focus:ring-green-500/30 focus:border-green-500/50'
                    : 'border-gray-700/50 focus:ring-cyan-500/30 focus:border-cyan-500/50'
                  }`}
                placeholder={liveGasPrice > 0 ? `Auto (${liveGasPrice.toFixed(1)})` : 'Auto (21)'}
              />
              {liveGasPrice > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-400 font-mono bg-cyan-400/10 px-2 py-1 rounded">
                  Live: {liveGasPrice.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Memo */}
          <div>
            <label className="text-gradient-green block text-sm font-medium mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              placeholder="Enter memo or note"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSending || !hasSufficientBalance}
            className={`btn-neon w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isFormValid && hasSufficientBalance ? 'hover:shadow-lg hover:shadow-cyan-500/20' : ''
              }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Transaction...
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                Send {selectedCrypto}
              </>
            )}
          </button>
        </form>

        {/* Transaction Result */}
        {txHash && (
          <div className="mt-4 bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 font-medium text-sm">Transaction Confirmed</span>
            </div>
            <div className="font-mono text-xs text-green-400/80 break-all space-y-1">
              {txHash.split(' | ').map((hash, i) => (
                <p key={i}>{hash}</p>
              ))}
            </div>
            {txExplorerUrl && (
              <a
                href={txExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSend}
        to={to}
        amount={amount}
        selectedCrypto={selectedCrypto}
        devFeeAmount={devFeeAmount.toFixed(8)}
        netAmount={netAmount.toFixed(8)}
        estimatedGas={gasEstimate ? `${(parseFloat(gasEstimate) * (liveGasPrice || 21) / 1e9).toFixed(8)}` : '0'}
        totalCost={totalCost}
        gasPriceGwei={gasPriceGwei || liveGasPrice.toFixed(1)}
        cryptoIcon={CryptoIcon}
      />
    </div>
  );
}
