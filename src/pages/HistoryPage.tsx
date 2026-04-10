import React, { useState, useMemo } from 'react';
import { useAccount } from '../context/WalletContext';
import {
  History,
  Search,
  Filter,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Ban,
  Clock,
  CheckCircle,
  X,
  Download,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Hash,
  Zap,
  Wallet,
  Layers,
} from 'lucide-react';

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
}

export function HistoryPage() {
  const { address } = useAccount();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [speedUpTx, setSpeedUpTx] = useState<string | null>(null);
  const [cancelTx, setCancelTx] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const transactions: Transaction[] = [
    {
      hash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      status: 'confirmed',
      value: '1.5 ETH',
      valueNum: 1.5,
      timestamp: '2024-02-20 14:32:10',
      date: '2024-02-20',
      to: '0x456789abcdef0123456789abcdef0123456789ab',
      from: '0x789abcdef0123456789abcdef0123456789abcdef',
      gas: '21000',
      gasPrice: '50',
      fee: '0.00105 ETH',
      block: 19234567,
      network: 'Ethereum',
      type: 'sent',
      nonce: 142,
    },
    {
      hash: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      status: 'pending',
      value: '0.5 ETH',
      valueNum: 0.5,
      timestamp: '2024-02-19 09:15:44',
      date: '2024-02-19',
      to: '0xabcdef0123456789abcdef0123456789abcdef01',
      from: '0xdef0123456789abcdef0123456789abcdef012345',
      gas: '21000',
      gasPrice: '45',
      fee: '0.000945 ETH',
      block: 19234100,
      network: 'Ethereum',
      type: 'received',
      nonce: 89,
    },
    {
      hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
      status: 'confirmed',
      value: '3.2 ETH',
      valueNum: 3.2,
      timestamp: '2024-02-18 21:07:33',
      date: '2024-02-18',
      to: '0x123456789abcdef0123456789abcdef0123456789',
      from: '0x456789abcdef0123456789abcdef0123456789abcd',
      gas: '65000',
      gasPrice: '55',
      fee: '0.003575 ETH',
      block: 19233890,
      network: 'Ethereum',
      type: 'received',
      nonce: 201,
    },
    {
      hash: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      status: 'failed',
      value: '0.08 ETH',
      valueNum: 0.08,
      timestamp: '2024-02-17 11:42:59',
      date: '2024-02-17',
      to: '0x789abcdef0123456789abcdef0123456789abcdef',
      from: '0xabcdef0123456789abcdef0123456789abcdef01',
      gas: '21000',
      gasPrice: '60',
      fee: '0.00126 ETH',
      block: 19232456,
      network: 'Ethereum',
      type: 'sent',
      nonce: 143,
    },
    {
      hash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      status: 'confirmed',
      value: '12.0 ETH',
      valueNum: 12.0,
      timestamp: '2024-02-16 06:20:15',
      date: '2024-02-16',
      to: '0xdef0123456789abcdef0123456789abcdef012345',
      from: '0x123456789abcdef0123456789abcdef0123456789a',
      gas: '21000',
      gasPrice: '42',
      fee: '0.000882 ETH',
      block: 19231200,
      network: 'Ethereum',
      type: 'sent',
      nonce: 144,
    },
    {
      hash: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a',
      status: 'pending',
      value: '0.25 ETH',
      valueNum: 0.25,
      timestamp: '2024-02-15 18:55:02',
      date: '2024-02-15',
      to: '0x456789abcdef0123456789abcdef0123456789abcd',
      from: '0x789abcdef0123456789abcdef0123456789abcdef0',
      gas: '45000',
      gasPrice: '48',
      fee: '0.00216 ETH',
      block: 19230789,
      network: 'Polygon',
      type: 'received',
      nonce: 67,
    },
    {
      hash: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      status: 'confirmed',
      value: '5.75 ETH',
      valueNum: 5.75,
      timestamp: '2024-02-14 13:10:47',
      date: '2024-02-14',
      to: '0xabcdef0123456789abcdef0123456789abcdef0123',
      from: '0xdef0123456789abcdef0123456789abcdef0123456',
      gas: '21000',
      gasPrice: '38',
      fee: '0.000798 ETH',
      block: 19229345,
      network: 'Ethereum',
      type: 'received',
      nonce: 312,
    },
    {
      hash: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
      status: 'failed',
      value: '2.0 ETH',
      valueNum: 2.0,
      timestamp: '2024-02-13 08:33:21',
      date: '2024-02-13',
      to: '0x123456789abcdef0123456789abcdef0123456789a',
      from: '0x456789abcdef0123456789abcdef0123456789abcd',
      gas: '100000',
      gasPrice: '65',
      fee: '0.0065 ETH',
      block: 19228901,
      network: 'Ethereum',
      type: 'sent',
      nonce: 145,
    },
    {
      hash: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d',
      status: 'confirmed',
      value: '0.15 ETH',
      valueNum: 0.15,
      timestamp: '2024-02-12 16:48:39',
      date: '2024-02-12',
      to: '0x789abcdef0123456789abcdef0123456789abcdef0',
      from: '0xabcdef0123456789abcdef0123456789abcdef012',
      gas: '21000',
      gasPrice: '35',
      fee: '0.000735 ETH',
      block: 19227654,
      network: 'Arbitrum',
      type: 'sent',
      nonce: 98,
    },
    {
      hash: '0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e',
      status: 'pending',
      value: '8.5 ETH',
      valueNum: 8.5,
      timestamp: '2024-02-11 22:05:11',
      date: '2024-02-11',
      to: '0xdef0123456789abcdef0123456789abcdef0123456',
      from: '0x123456789abcdef0123456789abcdef0123456789a',
      gas: '21000',
      gasPrice: '52',
      fee: '0.001092 ETH',
      block: 19226890,
      network: 'Ethereum',
      type: 'received',
      nonce: 445,
    },
    {
      hash: '0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f',
      status: 'confirmed',
      value: '0.032 ETH',
      valueNum: 0.032,
      timestamp: '2024-02-10 10:27:58',
      date: '2024-02-10',
      to: '0x456789abcdef0123456789abcdef0123456789abcd',
      from: '0x789abcdef0123456789abcdef0123456789abcdef0',
      gas: '21000',
      gasPrice: '30',
      fee: '0.00063 ETH',
      block: 19225432,
      network: 'Optimism',
      type: 'sent',
      nonce: 56,
    },
    {
      hash: '0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a',
      status: 'confirmed',
      value: '20.0 ETH',
      valueNum: 20.0,
      timestamp: '2024-02-09 03:14:26',
      date: '2024-02-09',
      to: '0xabcdef0123456789abcdef0123456789abcdef012',
      from: '0xdef0123456789abcdef0123456789abcdef0123456',
      gas: '21000',
      gasPrice: '40',
      fee: '0.00084 ETH',
      block: 19224100,
      network: 'Ethereum',
      type: 'received',
      nonce: 789,
    },
    {
      hash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
      status: 'failed',
      value: '1.0 ETH',
      valueNum: 1.0,
      timestamp: '2024-02-08 19:59:03',
      date: '2024-02-08',
      to: '0x123456789abcdef0123456789abcdef0123456789a',
      from: '0x456789abcdef0123456789abcdef0123456789abcd',
      gas: '21000',
      gasPrice: '58',
      fee: '0.001218 ETH',
      block: 19223567,
      network: 'Ethereum',
      type: 'sent',
      nonce: 146,
    },
    {
      hash: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
      status: 'confirmed',
      value: '0.75 ETH',
      valueNum: 0.75,
      timestamp: '2024-02-07 07:41:17',
      date: '2024-02-07',
      to: '0x789abcdef0123456789abcdef0123456789abcdef0',
      from: '0xabcdef0123456789abcdef0123456789abcdef012',
      gas: '55000',
      gasPrice: '44',
      fee: '0.00242 ETH',
      block: 19222890,
      network: 'Polygon',
      type: 'received',
      nonce: 123,
    },
    {
      hash: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      status: 'pending',
      value: '4.2 ETH',
      valueNum: 4.2,
      timestamp: '2024-02-06 15:22:50',
      date: '2024-02-06',
      to: '0xdef0123456789abcdef0123456789abcdef0123456',
      from: '0x123456789abcdef0123456789abcdef0123456789a',
      gas: '21000',
      gasPrice: '47',
      fee: '0.000987 ETH',
      block: 19221456,
      network: 'Ethereum',
      type: 'sent',
      nonce: 147,
    },
    {
      hash: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
      status: 'confirmed',
      value: '0.99 ETH',
      valueNum: 0.99,
      timestamp: '2024-02-05 12:08:34',
      date: '2024-02-05',
      to: '0x456789abcdef0123456789abcdef0123456789abcd',
      from: '0x789abcdef0123456789abcdef0123456789abcdef0',
      gas: '21000',
      gasPrice: '36',
      fee: '0.000756 ETH',
      block: 19220123,
      network: 'Arbitrum',
      type: 'sent',
      nonce: 99,
    },
    {
      hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
      status: 'confirmed',
      value: '6.66 ETH',
      valueNum: 6.66,
      timestamp: '2024-02-04 01:53:42',
      date: '2024-02-04',
      to: '0xabcdef0123456789abcdef0123456789abcdef012',
      from: '0xdef0123456789abcdef0123456789abcdef0123456',
      gas: '21000',
      gasPrice: '41',
      fee: '0.000861 ETH',
      block: 19219876,
      network: 'Ethereum',
      type: 'received',
      nonce: 567,
    },
    {
      hash: '0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
      status: 'failed',
      value: '0.5 ETH',
      valueNum: 0.5,
      timestamp: '2024-02-03 20:37:15',
      date: '2024-02-03',
      to: '0x123456789abcdef0123456789abcdef0123456789a',
      from: '0x456789abcdef0123456789abcdef0123456789abcd',
      gas: '21000',
      gasPrice: '62',
      fee: '0.001302 ETH',
      block: 19218543,
      network: 'Ethereum',
      type: 'sent',
      nonce: 148,
    },
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || tx.status === filter;
      const matchesNetwork = networkFilter === 'all' || tx.network === networkFilter;

      let matchesTimeRange = true;
      if (timeRange !== 'all') {
        const txDate = new Date(tx.date);
        const now = new Date('2024-02-20');
        const diffMs = now.getTime() - txDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (timeRange === 'day') matchesTimeRange = diffDays <= 1;
        else if (timeRange === 'week') matchesTimeRange = diffDays <= 7;
        else if (timeRange === 'month') matchesTimeRange = diffDays <= 30;
      }

      return matchesSearch && matchesFilter && matchesNetwork && matchesTimeRange;
    });
  }, [searchTerm, filter, timeRange, networkFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const summaryStats = useMemo(() => {
    const confirmed = transactions.filter((tx) => tx.status === 'confirmed');
    const totalSent = confirmed
      .filter((tx) => tx.type === 'sent')
      .reduce((sum, tx) => sum + tx.valueNum, 0);
    const totalReceived = confirmed
      .filter((tx) => tx.type === 'received')
      .reduce((sum, tx) => sum + tx.valueNum, 0);
    const pendingCount = transactions.filter((tx) => tx.status === 'pending').length;
    return { totalSent, totalReceived, pendingCount };
  }, []);

  const exportToCSV = () => {
    const headers = ['Hash', 'Status', 'Value', 'Type', 'Date', 'From', 'To', 'Gas', 'Fee', 'Network'];
    const rows = filteredTransactions.map((tx) => [
      tx.hash,
      tx.status,
      tx.value,
      tx.type,
      tx.timestamp,
      tx.from,
      tx.to,
      tx.gas,
      tx.fee,
      tx.network,
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
            <Clock className="w-3 h-3" /> Pending
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
        <button
          onClick={exportToCSV}
          className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
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
          <p className="text-2xl font-bold text-gradient">{summaryStats.totalSent.toFixed(3)} ETH</p>
        </div>
        <div className="card-glass neon-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-gray-400">Total Received</span>
          </div>
          <p className="text-2xl font-bold text-gradient">{summaryStats.totalReceived.toFixed(3)} ETH</p>
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
              placeholder="Search by hash, address..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
          >
            <option value="all">All Time</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
          <div className="md:col-span-4">
            <select
              value={networkFilter}
              onChange={(e) => {
                setNetworkFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
            >
              <option value="all">All Networks</option>
              <option value="Ethereum">Ethereum</option>
              <option value="Polygon">Polygon</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Optimism">Optimism</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
        </p>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {paginatedTransactions.length === 0 ? (
          <div className="card-glass neon-border rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          paginatedTransactions.map((tx) => (
            <div key={tx.hash} className="card-glass neon-border rounded-xl overflow-hidden transition-all duration-200">
              {/* Main Row */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${tx.type === 'sent' ? 'bg-red-500/20 border border-red-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'}`}>
                      {tx.type === 'sent' ? (
                        <ArrowUpRight className="w-5 h-5 text-red-400" />
                      ) : (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm text-gray-200">{shortenHash(tx.hash)}</p>
                        {getStatusBadge(tx.status)}
                        {getNetworkBadge(tx.network)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {tx.timestamp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Hash className="w-3 h-3" /> #{tx.nonce}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg ${tx.type === 'sent' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'sent' ? '-' : '+'}{tx.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Gas: {tx.gas} @ {tx.gasPrice} Gwei
                    </p>
                  </div>
                </div>

                {/* Expand/Collapse */}
                <button
                  onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                  className="mt-3 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors w-full justify-center"
                >
                  {expandedTx === tx.hash ? (
                    <>Hide Details <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>View Details <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>

                {/* Expanded Details */}
                {expandedTx === tx.hash && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">From:</span>
                        <span className="font-mono text-gray-300">{shortenAddress(tx.from)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">To:</span>
                        <span className="font-mono text-gray-300">{shortenAddress(tx.to)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">Block:</span>
                        <span className="text-gray-300">{tx.block.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">Hash:</span>
                        <span className="font-mono text-gray-300">{tx.hash}</span>
                        <a href="#" className="text-purple-400 hover:text-purple-300">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">Gas Limit:</span>
                        <span className="text-gray-300">{parseInt(tx.gas).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-500">Fee:</span>
                        <span className="text-gray-300">{tx.fee}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Pending */}
                {tx.status === 'pending' && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 flex flex-wrap gap-3">
                    <button
                      onClick={() => setSpeedUpTx(tx.hash)}
                      className="btn-neon inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                    >
                      <RefreshCw className="w-4 h-4" /> Speed Up
                    </button>
                    <button
                      onClick={() => setCancelTx(tx.hash)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                    >
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
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === currentPage
                ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
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
              <button
                onClick={() => setSpeedUpTx(null)}
                className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Hash: <span className="font-mono text-gray-300">{shortenHash(speedUpTx)}</span>
            </p>
            <div className="space-y-3 mb-6">
              {(() => {
                const tx = transactions.find((t) => t.hash === speedUpTx);
                if (!tx) return null;
                const gas = getGasOption(parseInt(tx.gasPrice));
                const options = [
                  { label: 'Slow', value: gas.slow, time: '~5 min', color: 'bg-gray-500/20 border-gray-500/30 text-gray-300' },
                  { label: 'Standard', value: gas.standard, time: '~2 min', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
                  { label: 'Fast', value: gas.fast, time: '~30 sec', color: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
                  { label: 'Urgent', value: gas.urgent, time: '~15 sec', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
                ];
                return options.map((opt) => (
                  <label
                    key={opt.label}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${opt.color}`}
                  >
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs ml-2 opacity-70">{opt.time}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono">{opt.value}</span>
                      <span className="text-xs ml-1 opacity-70">Gwei</span>
                    </div>
                  </label>
                ));
              })()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSpeedUpTx(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 transition-all"
              >
                Cancel
              </button>
              <button className="btn-neon flex-1 px-4 py-2 rounded-lg">
                Confirm Speed Up
              </button>
            </div>
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
              <button
                onClick={() => setCancelTx(null)}
                className="p-1 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-300">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Warning: Cancelling a transaction sends a replacement transaction with the same nonce and higher gas price. The original transaction may still be included if the cancellation is not mined first.
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Transaction: <span className="font-mono text-gray-300">{shortenHash(cancelTx)}</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">
              A gas fee of ~0.001 ETH will be charged for the cancellation.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTx(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 transition-all"
              >
                Go Back
              </button>
              <button className="inline-flex items-center justify-center gap-2 flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                <Ban className="w-4 h-4" /> Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
