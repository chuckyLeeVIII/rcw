import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Bot, BadgeCheck, ShieldCheck, Sparkles, ClipboardCheck, User, Upload, FileJson, Activity, Terminal, Play, Square, Search, Zap } from 'lucide-react';
import { useRecoveryPool, PoolWallet } from '../context/RecoveryPoolContext';
import { generateRecoveryRecommendation, parseWalletFile } from '../utils/recoveryAssistant';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [proofInput, setProofInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [parseResults, setParseResults] = useState<{keys: string[], seeds: string[], shards: string[], passwords: string[], errors: string[]} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // New: Live Intelligence Feed
  const [liveHits, setLiveHits] = useState<any[]>([]);
  const [agentStatus, setAgentStatus] = useState<any>(null);

  const selectedWallet = useMemo<PoolWallet | undefined>(
    () => recoveryPool.discoveredWallets.find((w) => w.id === selectedWalletId) as PoolWallet | undefined,
    [recoveryPool.discoveredWallets, selectedWalletId],
  );

  const recommendation = useMemo(
    () => generateRecoveryRecommendation(proofInput, selectedWallet),
    [proofInput, selectedWallet],
  );

  // Poll for hits and status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [hitsRes, statusRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/scan/results?limit=50'),
          fetch('http://127.0.0.1:8000/api/status')
        ]);
        const hitsData = await hitsRes.json();
        const statusData = await statusRes.json();

        if (hitsData.hits) setLiveHits(hitsData.hits);
        setAgentStatus(statusData);
      } catch (err) {
        console.error('Failed to poll intelligence feed:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAttachProof = async () => {
    if (!selectedWallet) return;
    if (proofInput.trim()) recoveryPool.setOwnershipProof(selectedWallet.id, proofInput.trim());
    if (ownerInput.trim()) recoveryPool.setWalletOwner(selectedWallet.id, ownerInput.trim());
    await recoveryPool.verifyOwnership(selectedWallet.id);
  };

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploadedFiles(files);
    setIsProcessing(true);
    setParseResults(null);
    const results = { keys: [] as string[], seeds: [] as string[], shards: [] as string[], passwords: [] as string[], errors: [] as string[] };
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseWalletFile(text, file.name);
        results.keys.push(...parsed.keys);
        results.seeds.push(...parsed.seeds);
        results.shards.push(...parsed.shards);
        results.passwords.push(...parsed.passwords);
        if (parsed.error) results.errors.push(`${file.name}: ${parsed.error}`);
      } catch (err) {
        results.errors.push(`${file.name}: Failed to parse - ${err}`);
      }
    }
    setParseResults(results);
    setIsProcessing(false);
    const extracted = [
      ...results.keys.map(k => `Private Key: ${k.slice(0, 20)}...`),
      ...results.seeds.map(s => `Seed: ${s.slice(0, 30)}...`),
      ...results.shards.map(s => `Key Shard: ${s.slice(0, 30)}...`),
      ...results.passwords.map(p => `Possible Password: ${p}`)
    ].join('\n');
    if (extracted) setProofInput(prev => prev + (prev ? '\n\n' : '') + `--- Extracted from files ---\n${extracted}`);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => processFiles(Array.from(e.target.files || []));

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* 1. Intelligence Feed & Agent Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 card-glass rounded-xl p-4 border border-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white uppercase tracking-wider text-sm">Live Intelligence Feed</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-500 animate-pulse">STREAMING_REALTIME_DATA</span>
          </div>
          <div className="bg-black/60 rounded-lg p-3 font-mono text-xs text-cyan-300 h-48 overflow-y-auto space-y-1">
            {liveHits.length === 0 ? (
              <div className="text-gray-600">Waiting for discovery events...</div>
            ) : (
              liveHits.map((hit, i) => (
                <div key={i} className="border-l border-cyan-900 pl-2">
                  <span className="text-gray-500">[{new Date(hit.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="text-yellow-400">{hit.artifact_type || hit.key_type}</span> found in{' '}
                  <span className="text-white">{hit.path || hit.source}</span>
                  {hit.total_usd > 0 && <span className="text-green-400 ml-2">(${hit.total_usd.toFixed(2)})</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card-glass rounded-xl p-4 border border-purple-500/20">
          <h3 className="font-bold text-white uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Agent Status
          </h3>
          <div className="space-y-3">
            <StatusItem label="KeyReducer" active={agentStatus?.running} />
            <StatusItem label="ScreenWatcher" active={agentStatus?.running} />
            <StatusItem label="ComputerScan" active={agentStatus?.computer_scanner?.running} />
            <StatusItem label="MixHunter" active={agentStatus?.running} />
          </div>
        </div>
      </div>

      {/* 2. Autonomous Controls */}
      <div className="card-glass rounded-xl p-6 border border-amber-500/20 space-y-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-6 h-6 text-amber-400" />
          <h3 className="font-bold text-white text-lg">Autonomous Recovery Controls</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={async () => {
              try {
                await fetch('http://127.0.0.1:8000/api/scan/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paths: ['/home/jules'] }),
                });
              } catch (err) { console.error(err); }
            }}
            className="flex flex-col items-center justify-center p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/20 transition-all group"
          >
            <Search className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-white">Trigger Deep Scan</span>
            <span className="text-[10px] text-gray-400 mt-1">Full Filesystem Analysis</span>
          </button>

          <button
            onClick={async () => {
              try {
                await fetch('http://127.0.0.1:8000/api/mixhunter/start', { method: 'POST' });
              } catch (err) { console.error(err); }
            }}
            className="flex flex-col items-center justify-center p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all group"
          >
            <Zap className="w-8 h-8 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-white">Ignite MixHunter</span>
            <span className="text-[10px] text-gray-400 mt-1">High-Speed Key Generation</span>
          </button>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
             <div className="flex items-center gap-2 mb-2 text-emerald-400">
                <BadgeCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase">Auto-Verification</span>
             </div>
             <p className="text-[10px] text-gray-400 leading-relaxed">
                Matches discovered keys against 8-chain richlist and verifies ownership signatures automatically.
             </p>
          </div>
        </div>
      </div>

      {/* 3. Input & Proof Context */}
      <div className="card-glass rounded-xl p-6 border border-cyan-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-300" />
          <h3 className="font-semibold text-white">Contextual Evidence Input</h3>
        </div>

        <div className="space-y-3">
          <select
            value={selectedWalletId}
            onChange={(e) => setSelectedWalletId(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">Select Target Wallet (Optional)</option>
            {recoveryPool.discoveredWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.network} · {wallet.address}
              </option>
            ))}
          </select>

          <input
            value={ownerInput}
            onChange={(e) => setOwnerInput(e.target.value)}
            placeholder="Identity/Owner Label (for internal audit)"
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white"
          />

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragActive(false); processFiles(Array.from(e.dataTransfer.files)); }}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 hover:border-cyan-500/30'
            }`}
          >
            <input type="file" multiple onChange={handleFileUpload} className="hidden" id="ai-file-upload" />
            <label htmlFor="ai-file-upload" className="cursor-pointer flex flex-col items-center gap-1">
              <Upload className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-semibold text-white">Drop or Click to Read Context Files</span>
              <span className="text-[10px] text-gray-500">JSON, .dat, .txt, .log, .csv</span>
            </label>
          </div>

          <textarea
            value={proofInput}
            onChange={(e) => setProofInput(e.target.value)}
            placeholder="Paste raw proof: signed messages, partial seeds, TXIDs, or shard fragments..."
            rows={4}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono"
          />

          <button
            onClick={handleAttachProof}
            disabled={!selectedWalletId}
            className="btn-neon px-4 py-3 rounded-xl text-sm font-bold w-full"
          >
            FINALIZE & INITIATE AI RECOVERY PLAN
          </button>
        </div>
      </div>

      {/* 4. Recommendations */}
      <div className="bg-gray-900/40 border border-gray-700/50 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-medium">{recommendation.summary}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-[11px]">
          <div className="space-y-2">
            <div className="text-cyan-400 uppercase font-bold tracking-tighter">Diagnostic Checks</div>
            <ul className="space-y-1">
              {recommendation.checks.map(c => <li key={c} className="text-gray-400 flex gap-2">
                <span className="text-cyan-900">►</span> {c}
              </li>)}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="text-emerald-400 uppercase font-bold tracking-tighter">Strategic Actions</div>
            <ul className="space-y-1">
              {recommendation.nextActions.map(a => <li key={a} className="text-gray-400 flex gap-2">
                <span className="text-emerald-900">►</span> {a}
              </li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, active }: { label: string, active?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-mono ${active ? 'text-emerald-400' : 'text-red-400'}`}>
          {active ? 'ONLINE' : 'OFFLINE'}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
      </div>
    </div>
  );
}
