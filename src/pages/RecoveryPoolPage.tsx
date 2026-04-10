import React, { useState, useRef } from 'react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import { useWallet } from '../context/WalletContext';
import {
  KeyRound,
  FileUp,
  Wallet,
  RefreshCw,
  Download,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  PlusCircle,
  Network,
} from 'lucide-react';
import { SUPPORTED_NETWORKS } from '../types/recoveryPool';

export function RecoveryPoolPage() {
  const recoveryPool = useRecoveryPool();
  const walletCtx = useWallet();
  const [activeTab, setActiveTab] = useState<'seed' | 'key' | 'file' | 'pool'>('pool');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [wifInput, setWifInput] = useState('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'funded'>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeedRecovery = async () => {
    setError(null);
    try {
      await recoveryPool.recoverFromSeed(mnemonicInput.trim(), passphrase || undefined);
      setMnemonicInput('');
      setPassphrase('');
      setActiveTab('pool');
    } catch (err: any) {
      setError(err.message || 'Recovery failed');
    }
  };

  const handleKeyRecovery = async () => {
    setError(null);
    try {
      await recoveryPool.recoverFromPrivateKey(privateKeyInput.trim());
      setPrivateKeyInput('');
      setActiveTab('pool');
    } catch (err: any) {
      setError(err.message || 'Recovery failed');
    }
  };

  const handleWIFRecovery = async () => {
    setError(null);
    try {
      await recoveryPool.recoverFromWIF(wifInput.trim());
      setWifInput('');
      setActiveTab('pool');
    } catch (err: any) {
      setError(err.message || 'Recovery failed');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await recoveryPool.recoverFromDatFile(file);
      setActiveTab('pool');
    } catch (err: any) {
      setError(err.message || 'File parsing failed');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedWallets(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredWallets = recoveryPool.discoveredWallets.filter(w => {
    if (filter === 'funded' && w.balance <= 0) return false;
    if (filterNetwork !== 'all' && w.network !== filterNetwork) return false;
    return true;
  });

  const totalFunds = Object.values(recoveryPool.totalBalance);
  const networkCount = Object.keys(recoveryPool.totalBalance).length;

  const inputClass =
    'w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono text-sm';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
            <Network className="w-8 h-8" />
            Recovery Pool
          </h1>
          <p className="text-gray-400 mt-1">
            {recoveryPool.discoveredWallets.length} addresses discovered across {networkCount} networks
            {totalFunds.length > 0 && ` | Total: ${totalFunds.map((v, i) => `${v.toFixed(4)} ${Object.keys(recoveryPool.totalBalance)[i]}`).join(', ')}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={recoveryPool.refreshBalances}
            disabled={recoveryPool.isScanning || recoveryPool.discoveredWallets.length === 0}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${recoveryPool.isScanning ? 'animate-spin' : ''}`} />
            Refresh Balances
          </button>
          <button
            onClick={recoveryPool.exportWallets}
            disabled={recoveryPool.discoveredWallets.length === 0}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={recoveryPool.clearPool}
            disabled={recoveryPool.isScanning}
            className="btn-neon flex items-center disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-sm border-red-500/30 hover:border-red-500/60"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Pool
          </button>
        </div>
      </div>

      {/* Recovery sources */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('seed')}
          className={`card-glass rounded-xl p-4 flex items-center space-x-3 hover:border-cyan-500/40 transition-all ${activeTab === 'seed' ? 'neon-border ring-2 ring-cyan-400/30' : 'border border-gray-700/30'}`}
        >
          <KeyRound className="w-8 h-8 text-cyan-400" />
          <div className="text-left">
            <div className="font-medium text-white">Seed Phrase</div>
            <div className="text-sm text-gray-400">12-24 word mnemonic</div>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('key')}
          className={`card-glass rounded-xl p-4 flex items-center space-x-3 hover:border-cyan-500/40 transition-all ${activeTab === 'key' ? 'neon-border ring-2 ring-cyan-400/30' : 'border border-gray-700/30'}`}
        >
          <Wallet className="w-8 h-8 text-emerald-400" />
          <div className="text-left">
            <div className="font-medium text-white">Private Key</div>
            <div className="text-sm text-gray-400">Hex or WIF format</div>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`card-glass rounded-xl p-4 flex items-center space-x-3 hover:border-cyan-500/40 transition-all ${activeTab === 'file' ? 'neon-border ring-2 ring-cyan-400/30' : 'border border-gray-700/30'}`}
        >
          <FileUp className="w-8 h-8 text-purple-400" />
          <div className="text-left">
            <div className="font-medium text-white">Wallet File</div>
            <div className="text-sm text-gray-400">.dat or encrypted</div>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('pool')}
          className={`card-glass rounded-xl p-4 flex items-center space-x-3 hover:border-cyan-500/40 transition-all ${activeTab === 'pool' ? 'neon-border ring-2 ring-cyan-400/30' : 'border border-gray-700/30'}`}
        >
          <Network className="w-8 h-8 text-amber-400" />
          <div className="text-left">
            <div className="font-medium text-white">Wallet Pool</div>
            <div className="text-sm text-gray-400">{recoveryPool.discoveredWallets.length} addresses</div>
          </div>
        </button>
      </div>

      {error && (
        <div className="card-glass border border-red-500/30 rounded-xl p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Recovery forms */}
      {activeTab === 'seed' && (
        <div className="card-glass rounded-xl p-6 neon-border">
          <h2 className="text-xl font-bold text-gradient-green mb-4">Recover from Seed Phrase</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Mnemonic Phrase (12, 15, 18, 21, or 24 words)</label>
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value.toLowerCase().trim())}
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="word1 word2 word3 ..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Passphrase (Optional)</label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className={inputClass}
                placeholder="BIP39 passphrase"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Scanning BIP44/49/84 paths across {SUPPORTED_NETWORKS.length} networks (BTC, ETH, LTC, DOGE, DASH, etc.)</span>
            </div>
            <button
              onClick={handleSeedRecovery}
              disabled={recoveryPool.isScanning || !mnemonicInput.trim()}
              className="w-full btn-neon disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl flex items-center justify-center"
            >
              {recoveryPool.isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning... {Math.round(recoveryPool.scanProgress)}%
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scan All Networks
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'key' && (
        <div className="space-y-4">
          <div className="card-glass rounded-xl p-6 neon-border">
            <h2 className="text-xl font-bold text-gradient-green mb-4">Recover from Private Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Private Key (Hex or WIF)</label>
                <textarea
                  value={privateKeyInput}
                  onChange={(e) => setPrivateKeyInput(e.target.value.trim())}
                  className={`${inputClass} resize-y`}
                  placeholder="0x... or WIF key"
                  rows={2}
                />
              </div>
              <button
                onClick={handleKeyRecovery}
                disabled={recoveryPool.isScanning || !privateKeyInput.trim()}
                className="w-full btn-neon disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl flex items-center justify-center"
              >
                {recoveryPool.isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan Networks
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="card-glass rounded-xl p-6 neon-border">
            <h2 className="text-xl font-bold text-gradient-green mb-4">Recover from WIF</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">WIF Private Key</label>
                <textarea
                  value={wifInput}
                  onChange={(e) => setWifInput(e.target.value.trim())}
                  className={`${inputClass} resize-y`}
                  placeholder="5K... or K... or L..."
                  rows={2}
                />
              </div>
              <button
                onClick={handleWIFRecovery}
                disabled={recoveryPool.isScanning || !wifInput.trim()}
                className="w-full btn-neon disabled:opacity-40 disabled:cursor-not-allowed px-4 py-3 rounded-xl flex items-center justify-center"
              >
                {recoveryPool.isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Scan Networks
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'file' && (
        <div className="card-glass rounded-xl p-6 neon-border">
          <h2 className="text-xl font-bold text-gradient-green mb-4">Recover from Wallet File</h2>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-600/50 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/40 transition-colors bg-gray-800/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-white">Upload wallet.dat or key file</p>
              <p className="text-sm text-gray-400 mt-2">
                Supports Bitcoin Core wallet.dat files and exported key files
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".dat,.key,.txt,.json"
                className="hidden"
              />
            </div>
            {recoveryPool.isScanning && (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-gray-300">Parsing file... {Math.round(recoveryPool.scanProgress)}%</span>
              </div>
            )}
            <div className="text-sm text-gray-400 space-y-1 bg-gray-800/30 rounded-lg p-4">
              <p>• Searches for WIF private keys (5/K/L prefixes)</p>
              <p>• Searches for hex private keys (64 chars)</p>
              <p>• Searches for BIP39 mnemonic seed phrases</p>
              <p>• Extracts Bitcoin and Ethereum addresses</p>
              <p>• Scans all discovered keys across {SUPPORTED_NETWORKS.length} networks</p>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Pool */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`btn-neon px-3 py-1.5 rounded-lg text-sm ${filter === 'all' ? 'ring-2 ring-cyan-400/50' : 'opacity-70'}`}
              >
                All ({recoveryPool.discoveredWallets.length})
              </button>
              <button
                onClick={() => setFilter('funded')}
                className={`btn-neon px-3 py-1.5 rounded-lg text-sm border-green-500/30 ${filter === 'funded' ? 'ring-2 ring-green-400/50' : 'opacity-70'}`}
              >
                Funded ({recoveryPool.discoveredWallets.filter(w => w.balance > 0).length})
              </button>
            </div>
            <select
              value={filterNetwork}
              onChange={(e) => setFilterNetwork(e.target.value)}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">All Networks</option>
              {SUPPORTED_NETWORKS.map(n => (
                <option key={n.id} value={n.name}>{n.name} ({n.symbol})</option>
              ))}
            </select>
          </div>

          {/* Recovery sources summary */}
          {recoveryPool.sources.length > 0 && (
            <div className="card-glass rounded-xl p-4 neon-border">
              <h3 className="font-medium text-white mb-2 text-gradient-green">Recovery Sources</h3>
              <div className="space-y-1">
                {recoveryPool.sources.map((src) => (
                  <div key={src.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300">{src.label}</span>
                      <span className="text-gray-500">({src.type})</span>
                    </div>
                    <span className="text-gray-400">{src.walletsFound} funded</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Wallet list */}
          {filteredWallets.length === 0 ? (
            <div className="card-glass rounded-xl p-8 text-center neon-border">
              <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No wallets discovered yet</h3>
              <p className="text-gray-400">
                Use the tabs above to recover wallets from seed phrases, private keys, or wallet files.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`card-glass rounded-xl transition-all ${wallet.balance > 0 ? 'neon-border border-green-500/30' : 'border border-gray-700/30'}`}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpand(wallet.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {expandedWallets.has(wallet.id) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <span className="font-mono text-sm text-white">{wallet.address.slice(0, 12)}...{wallet.address.slice(-8)}</span>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {wallet.network} • {wallet.derivationType} • {wallet.path}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${wallet.source === 'seed' ? 'bg-blue-500/20 text-blue-400' :
                          wallet.source === 'datFile' ? 'bg-purple-500/20 text-purple-400' :
                            wallet.source === 'wif' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-amber-500/20 text-amber-400'
                        }`}>
                        {wallet.source}
                      </span>
                      {wallet.balance > 0 && (
                        <span className="text-green-400 font-mono font-medium">
                          {wallet.balanceFormatted} {wallet.symbol}
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedWallets.has(wallet.id) && (
                    <div className="border-t border-gray-700/50 p-4 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">Full Address</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-sm font-mono bg-gray-800/50 border border-gray-700/30 px-3 py-1.5 rounded flex-1 break-all text-gray-300">
                            {wallet.address}
                          </code>
                          <button onClick={() => copyToClipboard(wallet.address)} className="p-1.5 hover:bg-gray-700/50 rounded transition-colors">
                            <Copy className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {wallet.publicKey && (
                        <div>
                          <label className="text-xs text-gray-500">Public Key</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs font-mono bg-gray-800/50 border border-gray-700/30 px-3 py-1.5 rounded flex-1 break-all text-gray-300">
                              {wallet.publicKey}
                            </code>
                            <button onClick={() => copyToClipboard(wallet.publicKey!)} className="p-1.5 hover:bg-gray-700/50 rounded transition-colors">
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )}

                      {wallet.privateKey && (
                        <div>
                          <label className="text-xs text-yellow-500/70 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" />
                            Private Key
                          </label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs font-mono bg-gray-800/50 border border-yellow-500/20 px-3 py-1.5 rounded flex-1 break-all text-gray-300">
                              {showKeys[wallet.id] ? wallet.privateKey : '••••••••••••••••'}
                            </code>
                            <button onClick={() => toggleShowKey(wallet.id)} className="p-1.5 hover:bg-gray-700/50 rounded transition-colors">
                              {showKeys[wallet.id] ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                            </button>
                            <button onClick={() => copyToClipboard(wallet.privateKey!)} className="p-1.5 hover:bg-gray-700/50 rounded transition-colors">
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500">
                          Derivation: {wallet.path} • Index: {wallet.accountIndex}/{wallet.addressIndex}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(wallet.address)}
                            className="btn-neon text-xs px-3 py-1.5 rounded-lg"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Address
                          </button>
                          <button
                            onClick={() => recoveryPool.removeWallet(wallet.id)}
                            className="btn-neon text-xs px-3 py-1.5 rounded-lg border-red-500/30 hover:border-red-500/60 text-red-400"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
