import React, { useState } from 'react';
import { WalletManager } from '../utils/wallet';
import {
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  KeyRound,
  Settings2,
  FileKey,
  Cpu,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';

export function WalletRecovery() {
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Basic Recovery
  const [basicInput, setBasicInput] = useState('');

  // Advanced Recovery
  const [masterKey, setMasterKey] = useState('');
  const [salt, setSalt] = useState('');
  const [iv, setIv] = useState('');
  const [iterations, setIterations] = useState('100000');
  const [rawInput, setRawInput] = useState('');

  // PyWallet Recovery
  const [encryptedData, setEncryptedData] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [network, setNetwork] = useState('bitcoin');

  // Bruteforce
  const [target, setTarget] = useState('');
  const [charset, setCharset] = useState('');
  const [maxLength, setMaxLength] = useState('8');
  const [currentAttempt, setCurrentAttempt] = useState('');
  const [bruteProgress, setBruteProgress] = useState(0);

  const handleBasicRecovery = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      const wallet = await WalletManager.validateAndRecover(basicInput);
      setResult(wallet);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvancedRecovery = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      const wallet = await WalletManager.advancedRecover({
        masterKey,
        salt,
        iv,
        iterations: parseInt(iterations),
        rawInput,
      });
      setResult(wallet);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePyWalletRecovery = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      const wallet = await WalletManager.recoverPyWallet({
        encryptedData,
        passphrase,
        network: network as 'bitcoin' | 'testnet',
      });
      setResult(wallet);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBruteforce = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      setBruteProgress(0);
      const wallet = await WalletManager.bruteforceRecover({
        target,
        charset,
        maxLength: parseInt(maxLength),
        onProgress: (attempt) => {
          setCurrentAttempt(attempt);
          setBruteProgress((prev) => Math.min(prev + 0.5, 99));
        },
      });
      setBruteProgress(100);
      setResult(wallet);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const tabs = [
    { id: 'basic', label: 'Basic', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'advanced', label: 'Advanced', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'pywallet', label: 'PyWallet', icon: <FileKey className="w-4 h-4" /> },
    { id: 'bruteforce', label: 'Brute Force', icon: <Cpu className="w-4 h-4" /> },
  ];

  const inputClass =
    'w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all font-mono text-sm';

  return (
    <div className="card-glass rounded-xl p-6 neon-border">
      {/* Security Warning */}
      <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-yellow-300 font-medium">Security Warning</p>
          <p className="text-xs text-gray-400 mt-1">
            Never expose your private keys or seed phrases. All operations run locally in your browser —
            no data leaves your device. Clear your clipboard after copying sensitive data.
          </p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setResult(null);
            }}
            className={`btn-neon flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                ? 'ring-2 ring-cyan-400/50'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Basic Recovery */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <textarea
              value={basicInput}
              onChange={(e) => setBasicInput(e.target.value)}
              className={`${inputClass} min-h-[100px] resize-y`}
              placeholder="Enter recovery phrase, private key, or WIF..."
            />
            <button
              onClick={handleBasicRecovery}
              disabled={isLoading || !basicInput.trim()}
              className="w-full btn-neon px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recovering...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Recover Wallet
                </>
              )}
            </button>
          </div>
        )}

        {/* Advanced Recovery */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Master Key (hex)</label>
              <input
                type="text"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                className={inputClass}
                placeholder="0x..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Salt (hex)</label>
                <input
                  type="text"
                  value={salt}
                  onChange={(e) => setSalt(e.target.value)}
                  className={inputClass}
                  placeholder="Salt..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">IV (hex)</label>
                <input
                  type="text"
                  value={iv}
                  onChange={(e) => setIv(e.target.value)}
                  className={inputClass}
                  placeholder="IV..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Iterations</label>
              <input
                type="number"
                value={iterations}
                onChange={(e) => setIterations(e.target.value)}
                className={inputClass}
                placeholder="100000"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Raw Input</label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Raw encrypted data..."
              />
            </div>
            <button
              onClick={handleAdvancedRecovery}
              disabled={isLoading || !masterKey || !salt || !iv || !rawInput}
              className="w-full btn-neon px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Settings2 className="w-4 h-4" />
                  Advanced Recovery
                </>
              )}
            </button>
          </div>
        )}

        {/* PyWallet Recovery */}
        {activeTab === 'pywallet' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Encrypted Wallet Data (hex)</label>
              <textarea
                value={encryptedData}
                onChange={(e) => setEncryptedData(e.target.value)}
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="Encrypted data from wallet.dat..."
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Passphrase</label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="Wallet passphrase..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassphrase ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Network</label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className={inputClass}
              >
                <option value="bitcoin">Bitcoin Mainnet</option>
                <option value="testnet">Bitcoin Testnet</option>
              </select>
            </div>
            <button
              onClick={handlePyWalletRecovery}
              disabled={isLoading || !encryptedData || !passphrase}
              className="w-full btn-neon px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Decrypting PyWallet...
                </>
              ) : (
                <>
                  <FileKey className="w-4 h-4" />
                  Recover PyWallet
                </>
              )}
            </button>
          </div>
        )}

        {/* Bruteforce Recovery */}
        {activeTab === 'bruteforce' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Target Hash (hex)</label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={inputClass}
                placeholder="Target hash to match..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Character Set</label>
                <input
                  type="text"
                  value={charset}
                  onChange={(e) => setCharset(e.target.value)}
                  className={inputClass}
                  placeholder="abcdef0123456789"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Max Length</label>
                <input
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(e.target.value)}
                  className={inputClass}
                  placeholder="8"
                  min="1"
                  max="16"
                />
              </div>
            </div>

            {/* Progress Bar */}
            {isLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Brute forcing...
                  </span>
                  <span className="text-cyan-400 font-mono">{Math.round(bruteProgress)}%</span>
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${bruteProgress}%` }}
                  />
                </div>
                {currentAttempt && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 font-mono text-xs text-gray-300 break-all">
                    Current: {currentAttempt}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleBruteforce}
              disabled={isLoading || !target}
              className="w-full btn-neon px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  Start Bruteforce
                </>
              )}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !['bruteforce'].includes(activeTab) && (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="ml-3 text-gray-300">Processing recovery...</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            {result.error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-400">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <CopyField
                    label="Network"
                    value={result.network}
                    onCopy={() => copyToClipboard(result.network, 'network')}
                    copied={copiedField === 'network'}
                  />
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <CopyField
                    label="Address"
                    value={result.address}
                    onCopy={() => copyToClipboard(result.address, 'address')}
                    copied={copiedField === 'address'}
                  />
                </div>

                {result.legacyAddress && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <CopyField
                      label="Legacy Address"
                      value={result.legacyAddress}
                      onCopy={() => copyToClipboard(result.legacyAddress, 'legacy')}
                      copied={copiedField === 'legacy'}
                    />
                  </div>
                )}

                {result.segwitAddress && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <CopyField
                      label="SegWit Address"
                      value={result.segwitAddress}
                      onCopy={() => copyToClipboard(result.segwitAddress, 'segwit')}
                      copied={copiedField === 'segwit'}
                    />
                  </div>
                )}

                {result.privateKey && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-yellow-400 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" />
                        Private Key
                      </label>
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {showPrivateKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-300 break-all flex-1">
                        {showPrivateKey ? result.privateKey : '••••••••••••••••••••••••••••••••'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(result.privateKey, 'privkey')}
                        className="p-1.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                      >
                        {copiedField === 'privkey' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {result.publicKey && (
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <CopyField
                      label="Public Key"
                      value={result.publicKey}
                      onCopy={() => copyToClipboard(result.publicKey, 'pubkey')}
                      copied={copiedField === 'pubkey'}
                    />
                  </div>
                )}

                {result.seedPhrase && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                    <label className="text-xs text-yellow-400 font-medium flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3 h-3" />
                      Seed Phrase
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-300 break-all flex-1">
                        {result.seedPhrase}
                      </code>
                      <button
                        onClick={() => copyToClipboard(result.seedPhrase, 'seed')}
                        className="p-1.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
                      >
                        {copiedField === 'seed' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Small helper component for copyable fields */
function CopyField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono text-gray-300 break-all flex-1">{value}</code>
        <button
          onClick={onCopy}
          className="p-1.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}
