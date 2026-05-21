import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useWallet } from '../context/WalletContext';
import {
  History, Search, Filter, TrendingUp, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Ban, Clock, CheckCircle, X, Download, ExternalLink,
  AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar, Hash, Zap, Wallet, Layers,
} from 'lucide-react';
import { ethers, BigNumber } from 'ethers';
import { getExplorerUrl, NETWORKS } from '../config/app';
import { API_KEYS } from '../config/app';

interface Transaction {
  hash: string;
  status: 'confirmed' | 'pending' | 'failed';
  value: string;
  valueNum: number;
  timestamp: string;
  date: string;
  to: string;
  from: string;
  gas: string;
  gasPrice: string;
  fee: string;
  block: number;
  network: string;
  type: 'sent' | 'received';
  nonce: number;
  chainId: number;
}

const ETHERSCAN_ENDPOINTS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  11155111: 'https://api-sepolia.etherscan.io/api',
  137: 'https://api.polygonscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  43114: 'https://api.snowtrace.io/api',
  8453: 'https://api.basescan.org/api',
};

const NETWORK_NAMES: Record<number, string> = {
  1: 'Ethereum',
  11155111: 'Sepolia',
  137: 'Polygon',
  42161: 'Arbitrum',
  10: 'Optimism',
  56: 'BSC',
  43114: 'Avalanche',
  8453: 'Base',
};

async function fetchEtherscanTxs(address: string, chainId: number): Promise<Transaction[]> {
  const base = ETHERSCAN_ENDPOINTS[chainId];
  if (!base) return [];
  const apiKey = API_KEYS.ETHERSCAN_API_KEY;
  const url = `${base}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc${apiKey ? '&apikey=' + apiKey : ''}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];
    return data.result.map((tx: any) => {
      const valueEth = parseFloat(ethers.utils.formatEther(tx.value || '0'));
      const gasPriceGwei = tx.gasPrice ? parseFloat(ethers.utils.formatUnits(tx.gasPrice, 'gwei')) : 0;
      const feeEth = tx.gasUsed && tx.gasPrice
        ? parseFloat(ethers.utils.formatEther(BigNumber.from(tx.gasUsed).mul(tx.gasPrice).toString()))
        : 0;
      const ts = parseInt(tx.timeStamp) * 1000;
      const dt = new Date(ts);
      const isPending = tx.confirmations === '0' || parseInt(tx.confirmations) === 0;
      const isFailed = tx.isError === '1' || tx.txreceipt_status === '0';
      return {
        hash: tx.hash,
        status: isPending ? 'pending' : (isFailed ? 'failed' : 'confirmed'),
        value: `${valueEth.toFixed(6)} ETH`,
        valueNum: valueEth,
        timestamp: dt.toISOString().replace('T', ' ').slice(0, 19),
        date: dt.toISOString().slice(0, 10),
        to: tx.to,
        from: tx.from,
        gas: tx.gasUsed || tx.gas,
        gasPrice: gasPriceGwei.toFixed(1),
        fee: `${feeEth.toFixed(6)} ETH`,
        block: parseInt(tx.blockNumber) || 0,
        network: NETWORK_NAMES[chainId] || `Chain ${chainId}`,
        type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
        nonce: parseInt(tx.nonce),
        chainId,
      };
    });
  } catch (e) {
    console.error('Etherscan fetch error:', e);
    return [];
  }
}

export function HistoryPage() {
  const { address, isConnected } = useAccount();
  const { provider, signer } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [speedUpTx, setSpeedUpTx] = useState<Transaction | null>(null);
  const [cancelTx, setCancelTx] = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch real transaction history
  const fetchHistory = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const allTxs: Transaction[] = [];
      // Fetch from supported EVM chains
      const chainIds = [1, 11155111, 137, 42161, 10, 56, 43114, 8453];
      await Promise.all(
        chainIds.map(async (chainId) => {
          const txs = await fetchEtherscanTxs(address, chainId);
          allTxs.push(...txs);
        })
      );
      // Sort by timestamp desc
      allTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(allTxs);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.network.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || tx.status === filter;
      const matchesNetwork = networkFilter === 'all' || tx.network === networkFilter;
      let matchesTimeRange = true;
      if (timeRange !== 'all') {
        const txDate = new Date(tx.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - txDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (timeRange === 'day') matchesTimeRange = diffDays <= 1;
        else if (timeRange === 'week') matchesTimeRange = diffDays <= 7;
        else if (timeRange === 'month') matchesTimeRange = diffDays <= 30;
      }
      return matchesSearch && matchesFilter && matchesNetwork && matchesTimeRange;
    });
  }, [transactions, searchTerm, filter, timeRange, networkFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const summaryStats = useMemo(() => {
    const confirmed = transactions.filter((tx) => tx.status === 'confirmed');
    const totalSent = confirmed.filter((tx) => tx.type === 'sent').reduce((sum, tx) => sum + tx.valueNum, 0);
    const totalReceived = confirmed.filter((tx) => tx.type === 'received').reduce((sum, tx) => sum + tx.valueNum, 0);
    const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;
    return { totalSent, totalReceived, pendingCount };
  }, [transactions]);

  const exportToCSV = () => {
    const headers = ['Hash', 'Status', 'Value', 'Type', 'Date', 'From', 'To', 'Gas', 'Fee', 'Network'];
    const rows = filteredTransactions.map((tx) => [
      tx.hash, tx.status, tx.value, tx.type, tx.timestamp, tx.from, tx.to, tx.gas, tx.fee, tx.network,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shortenHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  const shortenAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  // REAL Speed Up: replace tx with same nonce + higher gas
  const handleSpeedUpConfirm = async (newGasPriceGwei: number) => {
    if (!speedUpTx || !provider || !signer || !address) return;
    try {
      const tx = await signer.sendTransaction({
        to: speedUpTx.to,
        value: ethers.utils.parseEther(speedUpTx.valueNum.toFixed(18)),
        nonce: speedUpTx.nonce,
        gasPrice: ethers.utils.parseUnits(newGasPriceGwei.toString(), 'gwei'),
        gasLimit: parseInt(speedUpTx.gas) || 21000,
      });
      alert(`Speed up tx sent: ${tx.hash}`);
      setSpeedUpTx(null);
      fetchHistory();
    } catch (err: any) {
      alert(`Speed up failed: ${err.message}`);
    }
  };

  // REAL Cancel: send 0 ETH to self with same nonce + higher gas
  const handleCancelConfirm = async () => {
    if (!cancelTx || !provider || !signer || !address) return;
    try {
      const gasPrice = ethers.utils.parseUnits(
        (parseFloat(cancelTx.gasPrice) * 1.5).toFixed(1),
        'gwei'
      );
      const tx = await signer.sendTransaction({
        to: address,
        value: 0,
        nonce: cancelTx.nonce,
        gasPrice,
        gasLimit: 21000,
      });
      alert(`Cancel tx sent: ${tx.hash}`);
      setCancelTx(null);
      fetchHistory();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Unconfirmed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <X className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return null;
    }
  };

  const getNetworkBadge = (network: string) => {
    const colors: Record<string, string> = {
      Ethereum: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Polygon: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      Arbitrum: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      Optimism: 'bg-red-500/20 text-red-400 border-red-500/30',
      BSC: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      Avalanche: 'bg-red-500/20 text-red-400 border-red-500/30',
      Base: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[network] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {network}
      </span>
    );
  };

  const getGasOption = (currentPrice: number) => {
    const slow = Math.max(1, Math.round(currentPrice * 0.8));
    const standard = currentPrice;
    const fast = Math.round(currentPrice * 1.3);
    const urgent = Math.round(currentPrice * 1.8);
    return { slow, standard, fast, urgent };
  };

  if (!isConnected) {
    return (
      <div className="card-glass neon-border rounded-2xl p-6 text-center">
        <Wallet className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <p className="text-gray-300">Please connect your wallet to view transaction history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <History className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">Transaction History</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchHistory} className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportToCSV} className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass neon-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-gray-400">Total Sent</span>
          </div>
          <p className="text-2xl font-bold text-gradient">{summaryStats.totalSent.toFixed(4)} ETH</p>
        </div>
        <div className="card-glass neon-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-gray-400">Total Received</span>
          </div>
          <p className="text-2xl font-bold text-gradient">{summaryStats.totalReceived.toFixed(4)} ETH</p>
        </div>
        <div className="card-glass neon-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-sm text-gray-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gradient">{summaryStats.pendingCount} transactions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-glass neon-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-300">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by hash, address, network, status..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all">
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select value={timeRange} onChange={(e) => { setTimeRange(e.target.value); setCurrentPage(1); }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all">
            <option value="all">All Time</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <div className="md:col-span-4">
            <select value={networkFilter} onChange={(e) => { setNetworkFilter(e.target.value); setCurrentPage(1); }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all">
              <option value="all">All Networks</option>
              {Object.values(NETWORK_NAMES).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {loading ? 'Loading...' : `Showing ${paginatedTransactions.length} of ${filteredTransactions.length} transactions`}
        </p>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {paginatedTransactions.length === 0 ? (
          <div className="card-glass neon-border rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-500 mt-1">{loading ? 'Fetching from chain...' : 'Try adjusting your filters'}</p>
          </div>
        ) : (
          paginatedTransactions.map((tx) => (
            <div key={tx.hash} className="card-glass neon-border rounded-xl overflow-hidden transition-all duration-200">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${tx.type === 'sent' ? 'bg-red-500/20 border border-red-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {tx.type === 'sent' ? <ArrowUpRight className="w-5 h-5 text-red-400" /> : <ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm text-gray-200">{shortenHash(tx.hash)}</p>
                        {getStatusBadge(tx.status)}
                        {getNetworkBadge(tx.network)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {tx.timestamp}</span>
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> #{tx.nonce}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg ${tx.type === 'sent' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'sent' ? '-' : '+'}{tx.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Gas: {tx.gas} @ {tx.gasPrice} Gwei</p>
                  </div>
                </div>

                <button onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                  className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors w-full justify-center">
                  {expandedTx === tx.hash ? <>Hide Details <ChevronUp className="w-3 h-3" /></> : <>View Details <ChevronDown className="w-3 h-3" /></>}
                </button>

                {expandedTx === tx.hash && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">From:</span><span className="font-mono text-gray-300">{shortenAddress(tx.from)}</span></div>
                      <div className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">To:</span><span className="font-mono text-gray-300">{shortenAddress(tx.to)}</span></div>
                      <div className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">Block:</span><span className="text-gray-300">{tx.block.toLocaleString()}</span></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">Hash:</span>
                        <span className="font-mono text-gray-300">{tx.hash}</span>
                        <a href={getExplorerUrl(Object.entries(NETWORK_NAMES).find(([,n]) => n === tx.network)?.[0] || 'eth-mainnet', tx.hash)} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300"><ExternalLink className="w-3 h-3" /></a>
                      </div>
                      <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">Gas Limit:</span><span className="text-gray-300">{parseInt(tx.gas).toLocaleString()}</span></div>
                      <div className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-gray-500" /><span className="text-gray-500">Fee:</span><span className="text-gray-300">{tx.fee}</span></div>
                    </div>
                  </div>
                )}

                {tx.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 flex flex-wrap gap-3">
                    <button onClick={() => setSpeedUpTx(tx)} className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm">
                      <RefreshCw className="w-4 h-4" /> Speed Up
                    </button>
                    <button onClick={() => setCancelTx(tx)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                      <Ban className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button key={page} onClick={() => setCurrentPage(page)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === currentPage ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300' : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}>
              {page}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Speed Up Modal */}
      {speedUpTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-glass neon-border rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-gradient">Speed Up Transaction</h3>
              </div>
              <button onClick={() => setSpeedUpTx(null)} className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">Hash: <span className="font-mono text-gray-300">{shortenHash(speedUpTx.hash)}</span></p>
            <div className="space-y-3 mb-6">
              {(() => {
                const gas = getGasOption(parseFloat(speedUpTx.gasPrice));
                const options = [
                  { label: 'Slow', value: gas.slow, time: '~5 min', color: 'bg-gray-500/20 border-gray-500/30 text-gray-300' },
                  { label: 'Standard', value: gas.standard, time: '~2 min', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                  { label: 'Fast', value: gas.fast, time: '~30 sec', color: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
                  { label: 'Urgent', value: gas.urgent, time: '~15 sec', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
                ];
                return options.map((opt) => (
                  <button key={opt.label} onClick={() => handleSpeedUpConfirm(opt.value)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${opt.color}`}>
                    <div><span className="font-medium">{opt.label}</span><span className="text-xs ml-2 opacity-70">{opt.time}</span></div>
                    <div className="text-right"><span className="font-mono">{opt.value}</span><span className="text-xs ml-1 opacity-70">Gwei</span></div>
                  </button>
                ));
              })()}
            </div>
            <button onClick={() => setSpeedUpTx(null)} className="w-full px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-glass neon-border rounded-2xl w-full max-w-md p-6 border-red-500/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-xl font-bold text-red-400">Cancel Transaction</h3>
              </div>
              <button onClick={() => setCancelTx(null)} className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-300"><AlertCircle className="w-4 h-4 inline mr-1" />
                Warning: Cancelling sends a replacement tx with the same nonce and higher gas. The original may still be included if the cancellation is not mined first.
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-2">Transaction: <span className="font-mono text-gray-300">{shortenHash(cancelTx.hash)}</span></p>
            <p className="text-sm text-gray-400 mb-6">Nonce: <span className="font-mono text-gray-300">{cancelTx.nonce}</span></p>
            <div className="flex gap-3">
              <button onClick={() => setCancelTx(null)} className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 transition-all">Go Back</button>
              <button onClick={handleCancelConfirm} className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                <Ban className="w-4 h-4" /> Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
