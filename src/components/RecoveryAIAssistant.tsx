import React, { useMemo, useState, useCallback } from 'react';
import { Bot, BadgeCheck, ShieldCheck, Sparkles, ClipboardCheck, User, Upload, FileJson } from 'lucide-react';
import { useRecoveryPool, PoolWallet } from '../context/RecoveryPoolContext';
import { generateRecoveryRecommendation, parseWalletFile } from '../utils/recoveryAssistant';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [proofInput, setProofInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [verified, setVerified] = useState<boolean | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parseResults, setParseResults] = useState<{keys: string[], seeds: string[], shards: string[], errors: string[]} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const selectedWallet = useMemo<PoolWallet | undefined>(
    () => recoveryPool.discoveredWallets.find((w) => w.id === selectedWalletId) as PoolWallet | undefined,
    [recoveryPool.discoveredWallets, selectedWalletId],
  );

  const recommendation = useMemo(
    () => generateRecoveryRecommendation(proofInput, selectedWallet),
    [proofInput, selectedWallet],
  );

  const handleAttachProof = async () => {
    if (!selectedWallet || !proofInput.trim()) return;
    recoveryPool.setOwnershipProof(selectedWallet.id, proofInput.trim());
    if (ownerInput.trim()) {
      recoveryPool.setWalletOwner(selectedWallet.id, ownerInput.trim());
    }
    const ok = await recoveryPool.verifyOwnership(selectedWallet.id);
    setVerified(ok);
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploadedFiles(files);
    setIsProcessing(true);
    setParseResults(null);
    
    const results = { keys: [] as string[], seeds: [] as string[], shards: [] as string[], errors: [] as string[] };
    
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseWalletFile(text, file.name);
        
        results.keys.push(...parsed.keys);
        results.seeds.push(...parsed.seeds);
        results.shards.push(...parsed.shards);
        if (parsed.error) results.errors.push(`${file.name}: ${parsed.error}`);
      } catch (err) {
        results.errors.push(`${file.name}: Failed to parse - ${err}`);
      }
    }
    
    setParseResults(results);
    setIsProcessing(false);
    
    // Auto-populate proof input with extracted data
    const extracted = [
      ...results.keys.map(k => `Private Key: ${k.slice(0, 20)}...`),
      ...results.seeds.map(s => `Seed: ${s.slice(0, 30)}...`),
      ...results.shards.map(s => `Key Shard: ${s.slice(0, 30)}...`)
    ].join('\n');
    
    if (extracted) {
      setProofInput(prev => prev + (prev ? '\n\n' : '') + `--- Extracted from files ---\n${extracted}`);
    }
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, [processFiles]);

  return (
    <div className="card-glass rounded-xl p-6 border border-cyan-500/20 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-cyan-300" />
        <h3 className="font-semibold text-white">AI Recovery Assistant</h3>
      </div>

      <p className="text-sm text-gray-300">
        Provide proof-of-ownership context and get a guided recovery plan with comprehensive derivation coverage.
      </p>

      <div className="space-y-3">
        <select
          value={selectedWalletId}
          onChange={(e) => {
            setSelectedWalletId(e.target.value);
            setVerified(null);
          }}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select recovered wallet (optional)</option>
          {recoveryPool.discoveredWallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.network} · {wallet.address}
            </option>
          ))}
        </select>

        <input
          value={ownerInput}
          onChange={(e) => setOwnerInput(e.target.value)}
          placeholder="Owner label (name, case ID, or contact)"
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm"
        />

        {/* File Upload - Drag & Drop */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragActive 
              ? 'border-cyan-500 bg-cyan-500/10' 
              : 'border-gray-700/50 hover:border-cyan-500/30'
          }`}
        >
          <input
            type="file"
            multiple
            accept=".json,.txt,.csv,.dat,.wallet,.key,.shard,.bak"
            onChange={handleFileUpload}
            className="hidden"
            id="wallet-file-upload"
          />
          <label htmlFor="wallet-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
            <Upload className={`w-5 h-5 ${isDragActive ? 'text-cyan-400 animate-bounce' : 'text-cyan-400'}`} />
            <span className="text-sm text-gray-300">
              {isDragActive ? 'Drop files here!' : 'Drop wallet files, key shards, or master keys'}
            </span>
            <span className="text-xs text-gray-500">JSON wallets, .dat files, text exports, shards</span>
          </label>
        </div>

        {isProcessing && (
          <div className="text-sm text-cyan-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin" />
            Processing files...
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="text-xs text-gray-400">
            Files: {uploadedFiles.map(f => f.name).join(', ')}
          </div>
        )}

        {parseResults && (
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-2 text-cyan-300">
              <FileJson className="w-4 h-4" />
              <span>Extracted {parseResults.keys.length} keys, {parseResults.seeds.length} seeds, {parseResults.shards.length} shards</span>
            </div>
            {parseResults.errors.length > 0 && (
              <div className="text-xs text-red-400 mt-1">
                {parseResults.errors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        )}

        <textarea
          value={proofInput}
          onChange={(e) => setProofInput(e.target.value)}
          placeholder="Paste signed message, TXID, address linkage, exchange record, or any proof material..."
          rows={4}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm resize-y"
        />

        <button
          onClick={handleAttachProof}
          disabled={!selectedWalletId || !proofInput.trim()}
          className="btn-neon px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Attach Proof & Verify Ownership
        </button>
      </div>

      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-gray-200">{recommendation.summary}</span>
        </div>
        <div className="text-xs text-gray-400">Confidence: {recommendation.confidence.toUpperCase()}</div>

        {verified !== null && (
          <div className={`text-xs flex items-center gap-1 ${verified ? 'text-green-300' : 'text-yellow-300'}`}>
            {verified ? <BadgeCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {verified ? 'Ownership verification passed.' : 'Ownership verification still needs stronger proof.'}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-cyan-300 mb-1 flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" />Key checks</div>
          <ul className="list-disc pl-4 text-gray-300 space-y-1">
            {recommendation.checks.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-emerald-300 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" />Next actions</div>
          <ul className="list-disc pl-4 text-gray-300 space-y-1">
            {recommendation.nextActions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <details className="text-xs text-gray-300">
        <summary className="cursor-pointer text-cyan-300">Show derivation paths preview</summary>
        <div className="mt-2 grid md:grid-cols-2 gap-1 font-mono text-[11px]">
          {recommendation.derivationPaths.map((path) => (
            <code key={path} className="bg-gray-900/40 rounded px-2 py-1 border border-gray-700/30">{path}</code>
          ))}
        </div>
      </details>
    </div>
  );
}
