import React, { useState } from 'react';
import { WalletManager } from '../utils/wallet';
import { Loader2 } from 'lucide-react';

export function WalletRecovery() {
  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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
  const [network, setNetwork] = useState('bitcoin');

  // Bruteforce
  const [target, setTarget] = useState('');
  const [charset, setCharset] = useState('');
  const [maxLength, setMaxLength] = useState('8');
  const [currentAttempt, setCurrentAttempt] = useState('');

  const handleBasicRecovery = async () => {
    try {
      setIsLoading(true);
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
      const wallet = await WalletManager.advancedRecover({
        masterKey,
        salt,
        iv,
        iterations: parseInt(iterations),
        rawInput
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
      const wallet = await WalletManager.recoverPyWallet({
        encryptedData,
        passphrase,
        network: network as 'bitcoin' | 'testnet'
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
      const wallet = await WalletManager.bruteforceRecover({
        target,
        charset,
        maxLength: parseInt(maxLength),
        onProgress: (attempt) => setCurrentAttempt(attempt)
      });
      setResult(wallet);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Wallet Recovery</h2>

      <div className="flex space-x-2 mb-6">
        {['basic', 'advanced', 'pywallet', 'bruteforce'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <textarea
              value={basicInput}
              onChange={(e) => setBasicInput(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 min-h-[100px]"
              placeholder="Enter recovery phrase, private key, or WIF..."
            />
            <button
              onClick={handleBasicRecovery}
              disabled={isLoading || !basicInput}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Recover Wallet
            </button>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <input
              type="text"
              value={masterKey}
              onChange={(e) => setMasterKey(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Master Key (hex)"
            />
            <input
              type="text"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Salt (hex)"
            />
            <input
              type="text"
              value={iv}
              onChange={(e) => setIv(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="IV (hex)"
            />
            <input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Iterations"
            />
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 min-h-[100px]"
              placeholder="Raw Input"
            />
            <button
              onClick={handleAdvancedRecovery}
              disabled={isLoading || !masterKey || !salt || !iv || !rawInput}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Advanced Recovery
            </button>
          </div>
        )}

        {activeTab === 'pywallet' && (
          <div className="space-y-4">
            <textarea
              value={encryptedData}
              onChange={(e) => setEncryptedData(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2 min-h-[100px]"
              placeholder="Encrypted Wallet Data (hex)"
            />
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Passphrase"
            />
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
            >
              <option value="bitcoin">Bitcoin</option>
              <option value="testnet">Testnet</option>
            </select>
            <button
              onClick={handlePyWalletRecovery}
              disabled={isLoading || !encryptedData || !passphrase}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Recover PyWallet
            </button>
          </div>
        )}

        {activeTab === 'bruteforce' && (
          <div className="space-y-4">
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Target Hash (hex)"
            />
            <input
              type="text"
              value={charset}
              onChange={(e) => setCharset(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Character Set (leave empty for default)"
            />
            <input
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2"
              placeholder="Max Length"
            />
            {currentAttempt && (
              <div className="bg-gray-700 rounded-lg px-4 py-2">
                Current attempt: {currentAttempt}
              </div>
            )}
            <button
              onClick={handleBruteforce}
              disabled={isLoading || !target}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Start Bruteforce
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2">Recovering wallet...</span>
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            {result.error ? (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                <p className="text-red-400">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Network</label>
                  <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                    {result.network}
                  </code>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                    {result.address}
                  </code>
                </div>
                {result.legacyAddress && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Legacy Address</label>
                    <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                      {result.legacyAddress}
                    </code>
                  </div>
                )}
                {result.segwitAddress && (
                  <div>
                    <label className="block text-sm font-medium mb-2">SegWit Address</label>
                    <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                      {result.segwitAddress}
                    </code>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Private Key</label>
                  <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                    {result.privateKey}
                  </code>
                </div>
                {result.publicKey && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Public Key</label>
                    <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                      {result.publicKey}
                    </code>
                  </div>
                )}
                {result.seedPhrase && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Seed Phrase</label>
                    <code className="block w-full bg-gray-900 rounded-lg px-4 py-2">
                      {result.seedPhrase}
                    </code>
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (window.ethereum && result.privateKey) {
                      try {
                        await window.ethereum.request({
                          method: 'eth_requestAccounts'
                        });
                        await window.ethereum.request({
                          method: 'wallet_importRawKey',
                          params: [result.privateKey, '']
                        });
                        alert('Wallet imported successfully!');
                      } catch (error: any) {
                        alert('Failed to import wallet: ' + error.message);
                      }
                    } else {
                      alert('Please install MetaMask to import the wallet');
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
                >
                  Import to MetaMask
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}