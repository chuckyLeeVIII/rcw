import React, { useState } from 'react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import {
  RefreshCw,
  Download,
  Trash2,
  Copy,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  Network,
  Vault,
  ArrowRightLeft,
  ShieldCheck,
  Send,
  AlertCircle,
} from 'lucide-react';
import { SUPPORTED_NETWORKS } from '../types/recoveryPool';
import { RecoveryAIAssistant } from '../components/RecoveryAIAssistant';

export function RecoveryPoolPage() {
  const recoveryPool = useRecoveryPool();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'funded'>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [sweepingId, setSweepingId] = useState<string | null>(null);

  // Send/Withdraw modal state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendWalletId, setSendWalletId] = useState<string | null>(null);
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const discoveredWallets = recoveryPool.discoveredWallets || [];
  const totalBalance = recoveryPool.totalBalance || {};

  const filteredWallets = discoveredWallets.filter(w => {
    if (filter === 'funded' && w.balance <= 0 && w.unconfirmedBalance <= 0) return false;
    if (filterNetwork !== 'all' && w.network !== filterNetwork) return false;
    return true;
  });

  const networkCount = new Set(discoveredWallets.map(w => w.network)).size;

  const handleSweep = async (walletId: string) => {
    setSweepingId(walletId);
    try {
      const result = await recoveryPool.sweepToPool(walletId);
      if (!result.success) {
        setError(result.error || 'Sweep failed');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSweepingId(null);
    }
  };

  const handleSend = async () => {
    if (!sendWalletId || !sendToAddress || !sendAmount) return;
    
    setSendLoading(true);
    setSendError(null);
    try {
      await recoveryPool.sendFromWallet(sendWalletId, sendToAddress, sendAmount);
      setSendModalOpen(false);
      setSendToAddress('');
      setSendAmount('');
    } catch (err) {
      setSendError(String(err));
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gradient-green">Recovery Pool</h2>
            <p className="text-gray-400">Master list of all discovered wallets and funds</p>
          </div>
          <div className="flex items-center space-x-2">
            <Vault className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-300">Air-gapped Recovery</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center space-x-2 mb-1">
              <Network className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-gray-400">Addresses</span>
            </div>
            <div className="text-2xl font-bold text-white">{discoveredWallets.length}</div>
            <div className="text-xs text-gray-500">{networkCount} networks</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Funded</span>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {discoveredWallets.filter(w => w.balance > 0).length}
            </div>
            <div className="text-xs text-gray-500">with balance</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center space-x-2 mb-1">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Total BTC</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {totalBalance.bitcoin || 0}
            </div>
            <div className="text-xs text-gray-500">Bitcoin</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/30">
            <div className="flex items-center space-x-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total ETH</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {totalBalance.ethereum || 0}
            </div>
            <div className="text-xs text-gray-500">Ethereum</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch('http://127.0.0.1:8000/api/scan/results?limit=10000');
                const data = await res.json();
                if (data.results?.hits) {
                  await recoveryPool.importScannerResults(data.results.hits);
                }
              } catch (err) {
                console.error('Failed to import scanner results:', err);
              }
            }}
            className="btn-neon flex items-center px-4 py-2 rounded-xl text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Import Scanner
          </button>
          <button
            onClick={recoveryPool.refreshBalances}
            disabled={recoveryPool.isScanning || discoveredWallets.length === 0}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${recoveryPool.isScanning ? 'animate-spin' : ''}`} />
            Refresh Balances
          </button>
          <button
            onClick={recoveryPool.exportWallets}
            disabled={discoveredWallets.length === 0}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={recoveryPool.clearPool}
            disabled={recoveryPool.isScanning}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm bg-red-500/20 border-red-500/30 hover:bg-red-500/30"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Pool
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`btn-neon px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'ring-2 ring-cyan-400/50' : 'opacity-70'}`}
          >
            All ({discoveredWallets.length})
          </button>
          <button
            onClick={() => setFilter('funded')}
            className={`btn-neon px-3 py-1.5 rounded-lg text-sm border-green-500/30 ${filter === 'funded' ? 'ring-2 ring-green-400/50' : 'opacity-70'}`}
          >
            Funded ({discoveredWallets.filter(w => w.balance > 0 || w.unconfirmedBalance > 0).length})
          </button>
        </div>
        <select
          value={filterNetwork}
          onChange={(e) => setFilterNetwork(e.target.value)}
          className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
        >
          <option value="all">All Networks</option>
          {SUPPORTED_NETWORKS.map(n => (
            <option key={n.id} value={n.id}>{n.name} ({n.symbol})</option>
          ))}
        </select>
      </div>

      {/* Wallet List */}
      <div className="space-y-3">
        {filteredWallets.length === 0 ? (
          <div className="card-glass rounded-xl p-8 text-center">
            <Vault className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No wallets found</p>
            <p className="text-sm text-gray-500 mt-2">Import scanner results to populate the pool</p>
          </div>
        ) : (
          filteredWallets.map((wallet) => (
            <div key={wallet.id} className="card-glass rounded-xl p-4 border border-gray-700/30">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${wallet.balance > 0 || wallet.unconfirmedBalance > 0 ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <span className="text-sm font-medium text-white">{wallet.network}</span>
                    <span className="text-xs text-gray-500">{wallet.symbol}</span>
                    {wallet.balance > 0 && (
                      <span className="text-xs text-green-400 font-medium">
                        {wallet.balanceFormatted} {wallet.symbol}
                      </span>
                    )}
                    {wallet.unconfirmedBalance > 0 && (
                      <span className="text-xs text-yellow-400 font-medium">
                        (+{wallet.unconfirmedBalanceFormatted} pending)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                      {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(wallet.address)}
                      className="text-gray-500 hover:text-cyan-400"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, [wallet.id]: !prev[wallet.id] }))}
                      className="text-gray-500 hover:text-cyan-400"
                    >
                      {showKeys[wallet.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  {showKeys[wallet.id] && wallet.privateKey && (
                    <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs">
                      <div className="text-gray-400">Private: {wallet.privateKey.slice(0, 20)}...</div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSendWalletId(wallet.id);
                      setSendModalOpen(true);
                    }}
                    className="btn-neon px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                  <button
                    onClick={() => handleSweep(wallet.id)}
                    disabled={sweepingId === wallet.id || wallet.balance <= 0}
                    className="btn-neon px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 disabled:opacity-40"
                  >
                    {sweepingId === wallet.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-3 h-3" />
                    )}
                    <span>Sweep</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Modal */}
      {sendModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-glass rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Send Funds</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">To Address</label>
                <input
                  type="text"
                  value={sendToAddress}
                  onChange={(e) => setSendToAddress(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white"
                  placeholder="0x..."
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Amount</label>
                <input
                  type="text"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white"
                  placeholder="0.0"
                />
              </div>
              {sendError && (
                <div className="text-sm text-red-400">{sendError}</div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleSend}
                  disabled={sendLoading || !sendToAddress || !sendAmount}
                  className="btn-neon flex-1 py-2 rounded-lg disabled:opacity-40"
                >
                  {sendLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send'}
                </button>
                <button
                  onClick={() => setSendModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card-glass rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <RecoveryAIAssistant />
    </div>
  );
}
