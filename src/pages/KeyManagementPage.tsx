import React, { useState } from 'react';
import { useKeyManagement } from '../context/KeyManagementContext';
import { NETWORKS, CryptoKey, KeyType, Contract } from '../types/keyManagement';
import {
  Key,
  Plus,
  FileUp,
  Download,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Edit3,
  Tag,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  FileText,
  Code,
  Send,
  ExternalLink,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Wallet,
  Layers,
  Upload,
  Zap,
} from 'lucide-react';

export function KeyManagementPage() {
  const km = useKeyManagement();
  const [activeTab, setActiveTab] = useState<'keys' | 'contracts'>('keys');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState<string | null>(null);
  const [showKeyDetails, setShowKeyDetails] = useState<CryptoKey | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Generate form
  const [genForm, setGenForm] = useState({ type: 'ethereum' as KeyType, label: '', network: 'eth-mainnet', passphrase: '', tags: '' });

  // Import form
  const [importForm, setImportForm] = useState({ type: 'ethereum' as KeyType, label: '', data: '', network: 'eth-mainnet', passphrase: '', tags: '' });

  const handleGenerate = async () => {
    await km.generateKey({
      type: genForm.type,
      label: genForm.label || `${genForm.type} key ${km.keys.length + 1}`,
      network: genForm.network,
      passphrase: genForm.passphrase || undefined,
      tags: genForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setShowGenerate(false);
    setGenForm({ type: 'ethereum', label: '', network: 'eth-mainnet', passphrase: '', tags: '' });
  };

  const handleImport = async () => {
    try {
      await km.importKey({
        type: importForm.type,
        label: importForm.label || `Imported ${importForm.type}`,
        data: importForm.data,
        format: importForm.data.startsWith('0x') ? 'hex' : 'wif',
        network: importForm.network,
        passphrase: importForm.passphrase || undefined,
        tags: importForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setShowImport(false);
      setImportForm({ type: 'ethereum', label: '', data: '', network: 'eth-mainnet', passphrase: '', tags: '' });
    } catch {
      // Error handled in context
    }
  };

  const toggleExpand = (id: string, isContract = false) => {
    if (isContract) {
      setExpandedContracts(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else {
      setExpandedKeys(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredKeys = km.keys.filter(k => {
    if (searchQuery && !k.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !k.address?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType !== 'all' && k.type !== filterType) return false;
    return true;
  });

  const filteredContracts = km.contracts.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {km.notifications.map(n => (
          <div key={n.id} className={`flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl ${
            n.type === 'success' ? 'bg-emerald-600/90' : n.type === 'error' ? 'bg-red-600/90' : 'bg-blue-600/90'
          }`} style={{ backdropFilter: 'blur(10px)' }}>
            {n.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{n.message}</span>
            <button onClick={() => km.dismissNotification(n.id)}><X className="w-4 h-4 ml-2" /></button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient flex items-center space-x-2">
            <Shield className="w-8 h-8 text-purple-400" />
            <span>Key & Contract Manager</span>
          </h1>
          <p className="text-gray-400 mt-1">
            {km.keys.length} keys | {km.contracts.length} contracts | {km.interactions.length} interactions
          </p>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setActiveTab('keys')} className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${activeTab === 'keys' ? 'bg-purple-600/30 ring-1 ring-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}>
            <Key className="w-4 h-4" />
            <span>Keys</span>
          </button>
          <button onClick={() => setActiveTab('contracts')} className={`px-4 py-2 rounded-xl flex items-center space-x-2 transition-all ${activeTab === 'contracts' ? 'bg-purple-600/30 ring-1 ring-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}>
            <Layers className="w-4 h-4" />
            <span>Contracts</span>
          </button>
        </div>
      </div>

      {/* Keys Tab */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button onClick={() => setShowGenerate(true)} className="btn-neon px-4 py-2.5 rounded-xl flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Generate Key</span>
            </button>
            <button onClick={() => setShowImport(true)} className="btn-neon px-4 py-2.5 rounded-xl flex items-center space-x-2">
              <FileUp className="w-4 h-4" />
              <span>Import Key</span>
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center space-x-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input type="text" placeholder="Search keys..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-purple-500/50 outline-none" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2 text-sm">
              <option value="all">All Types</option>
              <option value="ethereum">Ethereum</option>
              <option value="bitcoin">Bitcoin</option>
            </select>
          </div>

          {/* Key List */}
          {filteredKeys.length === 0 ? (
            <div className="card-glass rounded-xl p-12 text-center">
              <Key className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No keys generated</h3>
              <p className="text-gray-400 mb-4">Generate or import keys to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKeys.map(key => (
                <div key={key.id} className="card-glass rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleExpand(key.id)}>
                    <div className="flex items-center space-x-3">
                      {expandedKeys.has(key.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${key.type === 'ethereum' ? 'bg-blue-500/20' : 'bg-orange-500/20'}`}>
                        <Wallet className={`w-4 h-4 ${key.type === 'ethereum' ? 'text-blue-400' : 'text-orange-400'}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{key.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{key.address?.slice(0, 12)}...{key.address?.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${key.type === 'ethereum' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                        {key.type}
                      </span>
                      <span className="text-xs text-gray-500">{key.usageCount} uses</span>
                      <div className="flex space-x-1">
                        <button onClick={e => { e.stopPropagation(); setShowExport(key.id); }} className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"><Download className="w-3.5 h-3.5 text-gray-400" /></button>
                        <button onClick={e => { e.stopPropagation(); km.deleteKey(key.id); }} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </div>
                  </div>

                  {expandedKeys.has(key.id) && (
                    <div className="border-t border-purple-500/10 p-4 space-y-3">
                      {key.address && (
                        <div>
                          <label className="text-xs text-gray-500">Address</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs font-mono bg-gray-900/50 px-3 py-1.5 rounded-lg flex-1 break-all">{key.address}</code>
                            <button onClick={() => copyToClipboard(key.address!)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                          </div>
                        </div>
                      )}
                      {key.publicKey && (
                        <div>
                          <label className="text-xs text-gray-500">Public Key</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-[10px] font-mono bg-gray-900/50 px-3 py-1.5 rounded-lg flex-1 break-all">{key.publicKey}</code>
                            <button onClick={() => copyToClipboard(key.publicKey)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                          </div>
                        </div>
                      )}
                      {key.mnemonic && (
                        <div>
                          <label className="text-xs text-gray-500">Mnemonic</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-xs font-mono bg-gray-900/50 px-3 py-1.5 rounded-lg flex-1 break-all">
                              {showKeys[key.id] ? key.mnemonic : '••••••••••••••••'}
                            </code>
                            <button onClick={() => toggleShowKey(key.id)} className="p-1.5 hover:bg-gray-700/50 rounded-lg">
                              {showKeys[key.id] ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-gray-400" />}
                            </button>
                            <button onClick={() => copyToClipboard(key.mnemonic!)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-wrap gap-1">
                          {key.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex items-center space-x-1">
                              <span>{tag}</span>
                              <button onClick={() => km.removeTag(key.id, tag)}><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">{key.network} • Created {new Date(key.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <ContractManager />
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <Modal onClose={() => setShowGenerate(false)} title="Generate New Key">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Key Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setGenForm(p => ({ ...p, type: 'ethereum' }))} className={`p-3 rounded-xl text-sm transition-all ${genForm.type === 'ethereum' ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}>
                  <Wallet className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <div>Ethereum</div>
                </button>
                <button onClick={() => setGenForm(p => ({ ...p, type: 'bitcoin' }))} className={`p-3 rounded-xl text-sm transition-all ${genForm.type === 'bitcoin' ? 'bg-orange-500/20 ring-1 ring-orange-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'}`}>
                  <Wallet className="w-5 h-5 mx-auto mb-1 text-orange-400" />
                  <div>Bitcoin</div>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Label</label>
              <input type="text" value={genForm.label} onChange={e => setGenForm(p => ({ ...p, label: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="My key" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Network</label>
              <select value={genForm.network} onChange={e => setGenForm(p => ({ ...p, network: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm">
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Passphrase (Optional)</label>
              <input type="password" value={genForm.passphrase} onChange={e => setGenForm(p => ({ ...p, passphrase: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="Encrypt key" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Tags (comma separated)</label>
              <input type="text" value={genForm.tags} onChange={e => setGenForm(p => ({ ...p, tags: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="trading, defi" />
            </div>
            <button onClick={handleGenerate} className="w-full btn-neon px-4 py-3 rounded-xl">
              <Zap className="w-4 h-4 inline mr-2" />
              Generate Key
            </button>
          </div>
        </Modal>
      )}

      {/* Import Modal */}
      {showImport && (
        <Modal onClose={() => setShowImport(false)} title="Import Key">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Key Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setImportForm(p => ({ ...p, type: 'ethereum' }))} className={`p-3 rounded-xl text-sm ${importForm.type === 'ethereum' ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'bg-gray-800/50'}`}>Ethereum</button>
                <button onClick={() => setImportForm(p => ({ ...p, type: 'bitcoin' }))} className={`p-3 rounded-xl text-sm ${importForm.type === 'bitcoin' ? 'bg-orange-500/20 ring-1 ring-orange-500/50' : 'bg-gray-800/50'}`}>Bitcoin</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Label</label>
              <input type="text" value={importForm.label} onChange={e => setImportForm(p => ({ ...p, label: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="Imported key" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Private Key / Mnemonic</label>
              <textarea value={importForm.data} onChange={e => setImportForm(p => ({ ...p, data: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-purple-500/50 outline-none" placeholder="0x... or mnemonic words" rows={3} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Network</label>
              <select value={importForm.network} onChange={e => setImportForm(p => ({ ...p, network: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm">
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <button onClick={handleImport} disabled={!importForm.data} className="w-full btn-neon px-4 py-3 rounded-xl disabled:opacity-40">
              <FileUp className="w-4 h-4 inline mr-2" />
              Import Key
            </button>
          </div>
        </Modal>
      )}

      {/* Export Modal */}
      {showExport && (
        <ExportModal keyId={showExport} onClose={() => setShowExport(null)} />
      )}
    </div>
  );
}

// Contract Manager Component
function ContractManager() {
  const km = useKeyManagement();
  const [view, setView] = useState<'list' | 'deploy' | 'import' | 'interact'>('list');
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [deployForm, setDeployForm] = useState({ name: '', abi: '', bytecode: '', network: 'eth-mainnet' });
  const [importForm, setImportForm] = useState({ name: '', address: '', abi: '', network: 'eth-mainnet' });

  const handleDeploy = async () => {
    await km.deployContract({
      name: deployForm.name,
      abi: deployForm.abi,
      bytecode: deployForm.bytecode,
      network: deployForm.network,
    });
    setView('list');
    setDeployForm({ name: '', abi: '', bytecode: '', network: 'eth-mainnet' });
  };

  const handleImport = async () => {
    km.importContractFromAddress(importForm.address, importForm.abi, importForm.network, importForm.name);
    setView('list');
    setImportForm({ name: '', address: '', abi: '', network: 'eth-mainnet' });
  };

  const toggleExpand = (id: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const filteredContracts = km.contracts.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex space-x-3">
        <button onClick={() => setView('deploy')} className={`btn-neon px-4 py-2.5 rounded-xl flex items-center space-x-2 ${view === 'deploy' ? 'ring-2 ring-purple-500' : ''}`}>
          <Code className="w-4 h-4" />
          <span>Deploy Contract</span>
        </button>
        <button onClick={() => setView('import')} className={`btn-neon px-4 py-2.5 rounded-xl flex items-center space-x-2 ${view === 'import' ? 'ring-2 ring-purple-500' : ''}`}>
          <Upload className="w-4 h-4" />
          <span>Import Contract</span>
        </button>
      </div>

      {/* Deploy Form */}
      {view === 'deploy' && (
        <div className="card-glass rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Deploy Smart Contract</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Contract Name</label>
              <input type="text" value={deployForm.name} onChange={e => setDeployForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="MyToken" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">ABI (JSON)</label>
              <textarea value={deployForm.abi} onChange={e => setDeployForm(p => ({ ...p, abi: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-xs font-mono focus:border-purple-500/50 outline-none" placeholder='[{"inputs":[],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"}]' rows={5} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Bytecode (hex)</label>
              <textarea value={deployForm.bytecode} onChange={e => setDeployForm(p => ({ ...p, bytecode: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-xs font-mono focus:border-purple-500/50 outline-none" placeholder="0x60806040..." rows={4} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Network</label>
              <select value={deployForm.network} onChange={e => setDeployForm(p => ({ ...p, network: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm">
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleDeploy} disabled={!deployForm.name || !deployForm.abi} className="flex-1 btn-neon px-4 py-3 rounded-xl disabled:opacity-40">Deploy</button>
              <button onClick={() => setView('list')} className="px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-600/50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Form */}
      {view === 'import' && (
        <div className="card-glass rounded-xl p-5">
          <h3 className="text-lg font-semibold mb-4">Import Contract</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Contract Name</label>
              <input type="text" value={importForm.name} onChange={e => setImportForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none" placeholder="USDC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Contract Address</label>
              <input type="text" value={importForm.address} onChange={e => setImportForm(p => ({ ...p, address: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-purple-500/50 outline-none" placeholder="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">ABI (JSON)</label>
              <textarea value={importForm.abi} onChange={e => setImportForm(p => ({ ...p, abi: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-xs font-mono focus:border-purple-500/50 outline-none" placeholder="Paste ABI JSON..." rows={5} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Network</label>
              <select value={importForm.network} onChange={e => setImportForm(p => ({ ...p, network: e.target.value }))} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm">
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div className="flex space-x-2">
              <button onClick={handleImport} disabled={!importForm.address || !importForm.abi} className="flex-1 btn-neon px-4 py-3 rounded-xl disabled:opacity-40">Import</button>
              <button onClick={() => setView('list')} className="px-4 py-3 rounded-xl bg-gray-700/50 hover:bg-gray-600/50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Contract List */}
      {view === 'list' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
            <input type="text" placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-purple-500/50 outline-none" />
          </div>

          {filteredContracts.length === 0 ? (
            <div className="card-glass rounded-xl p-12 text-center">
              <Layers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No contracts</h3>
              <p className="text-gray-400">Deploy or import a smart contract to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContracts.map(contract => (
                <div key={contract.id} className="card-glass rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => toggleExpand(contract.id)}>
                    <div className="flex items-center space-x-3">
                      {expandedContracts.has(contract.id) ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Code className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center space-x-2">
                          <span>{contract.name}</span>
                          {contract.verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{contract.address.slice(0, 10)}...{contract.address.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">{contract.functions.length} functions</span>
                      <button onClick={e => { e.stopPropagation(); km.deleteContract(contract.id); }} className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  {expandedContracts.has(contract.id) && (
                    <div className="border-t border-purple-500/10 p-4 space-y-3">
                      <div>
                        <label className="text-xs text-gray-500">Address</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-xs font-mono bg-gray-900/50 px-3 py-1.5 rounded-lg flex-1 break-all">{contract.address}</code>
                          <button onClick={() => copyToClipboard(contract.address)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500">Network</label>
                          <div className="text-sm mt-1">{NETWORKS.find(n => n.id === contract.network)?.name || contract.network}</div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Deployed</label>
                          <div className="text-sm mt-1">{new Date(contract.deployedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {contract.functions.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500">Functions ({contract.functions.length})</label>
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {contract.functions.map((fn, i) => (
                              <div key={i} className="flex items-center space-x-2 text-xs bg-gray-900/30 px-3 py-1.5 rounded-lg">
                                <span className={`w-1.5 h-1.5 rounded-full ${fn.stateMutability === 'view' || fn.stateMutability === 'pure' ? 'bg-blue-400' : fn.stateMutability === 'payable' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                                <code className="font-mono">{fn.name}({fn.inputs.map(p => p.type).join(', ')})</code>
                                <span className="text-gray-500">→ {fn.outputs.map(p => p.type).join(', ') || 'void'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {contract.events.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500">Events ({contract.events.length})</label>
                          <div className="mt-2 space-y-1">
                            {contract.events.map((ev, i) => (
                              <div key={i} className="flex items-center space-x-2 text-xs bg-gray-900/30 px-3 py-1.5 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                <code className="font-mono">{ev.name}({ev.inputs.map(p => p.type).join(', ')})</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <ContractInteractionForm contract={contract} />
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

// Contract Interaction Form
function ContractInteractionForm({ contract }: { contract: Contract }) {
  const km = useKeyManagement();
  const [selectedFn, setSelectedFn] = useState('');
  const [paramValues, setParamValues] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const fn = contract.functions.find(f => f.name === selectedFn);

  const handleCall = async () => {
    if (!fn) return;
    const interaction = await km.interactWithContract({
      contractId: contract.id,
      functionName: fn.name,
      params: paramValues.map((v, i) => {
        const input = fn.inputs[i];
        if (input.type === 'uint256' || input.type === 'uint' || input.type === 'int256' || input.type === 'int') return parseInt(v) || 0;
        if (input.type === 'bool') return v === 'true';
        return v;
      }),
    });
    setResult(JSON.stringify(interaction.result || 'Transaction submitted'));
  };

  return (
    <div className="border-t border-purple-500/10 pt-4 space-y-3">
      <label className="text-xs font-medium text-gray-400">Interact with Contract</label>
      <select value={selectedFn} onChange={e => { setSelectedFn(e.target.value); setParamValues([]); setResult(null); }} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm">
        <option value="">Select function...</option>
        {contract.functions.filter(f => f.name).map(f => (
          <option key={f.name} value={f.name}>{f.name}({f.inputs.map(p => `${p.type} ${p.name}`).join(', ')})</option>
        ))}
      </select>

      {fn && fn.inputs.map((input, i) => (
        <input key={i} type="text" placeholder={`${input.name} (${input.type})`} value={paramValues[i] || ''} onChange={e => { const nv = [...paramValues]; nv[i] = e.target.value; setParamValues(nv); }} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm font-mono" />
      ))}

      {fn && (
        <button onClick={handleCall} className="w-full btn-neon px-4 py-2.5 rounded-xl text-sm">
          <Send className="w-4 h-4 inline mr-2" />
          Call {fn.name}
        </button>
      )}

      {result && (
        <div className="bg-gray-900/50 rounded-xl p-3">
          <label className="text-xs text-gray-500">Result</label>
          <code className="block text-xs font-mono mt-1 break-all">{result}</code>
        </div>
      )}
    </div>
  );
}

// Modal Component
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card-glass rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ boxShadow: '0 20px 60px rgba(139,92,246,0.2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Export Modal
function ExportModal({ keyId, onClose }: { keyId: string; onClose: () => void }) {
  const km = useKeyManagement();
  const [exportData, setExportData] = useState<{ privateKey: string; mnemonic?: string } | null>(null);
  const [passphrase, setPassphrase] = useState('');

  const handleExport = async () => {
    try {
      const data = await km.exportKey(keyId, passphrase);
      setExportData({ privateKey: data.privateKey, mnemonic: data.mnemonic });
    } catch {
      // handled
    }
  };

  const key = km.keys.find(k => k.id === keyId);

  return (
    <Modal onClose={onClose} title="Export Key">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">Exporting: <span className="font-medium">{key?.label}</span></p>
        {!exportData ? (
          <>
            {key?.isEncrypted && (
              <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm" placeholder="Enter passphrase" />
            )}
            <button onClick={handleExport} className="w-full btn-neon px-4 py-3 rounded-xl">
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
          </>
        ) : (
          <div className="space-y-3">
            {exportData.privateKey && (
              <div>
                <label className="text-xs text-gray-500">Private Key</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-xs font-mono bg-gray-900/50 px-3 py-2 rounded-lg flex-1 break-all">{exportData.privateKey}</code>
                  <button onClick={() => navigator.clipboard.writeText(exportData.privateKey)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              </div>
            )}
            {exportData.mnemonic && (
              <div>
                <label className="text-xs text-gray-500">Mnemonic</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-xs font-mono bg-gray-900/50 px-3 py-2 rounded-lg flex-1 break-all">{exportData.mnemonic}</code>
                  <button onClick={() => navigator.clipboard.writeText(exportData.mnemonic!)} className="p-1.5 hover:bg-gray-700/50 rounded-lg"><Copy className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
              </div>
            )}
            <button onClick={() => {
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `key-${keyId}.json`; a.click();
            }} className="w-full btn-neon px-4 py-3 rounded-xl">
              <FileText className="w-4 h-4 inline mr-2" />
              Download JSON
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
