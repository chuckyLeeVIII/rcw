import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Bot, Sparkles, Upload, Activity, Search, Target } from 'lucide-react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import { parseWalletFile } from '../utils/recoveryAssistant';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [proofInput, setProofInput] = useState('');
  const [targetAddress, setTargetAddress] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  // Intelligence Feed
  const [liveHits, setLiveHits] = useState<any[]>([]);

  // Poll for hits
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/scan/results?limit=50');
        const data = await res.json();
        if (data.hits) setLiveHits(data.hits);
      } catch (err) {
        console.error('Failed to poll intelligence feed:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseWalletFile(text, file.name);
        const extracted = [
          ...parsed.keys.map(k => `Private Key: ${k.slice(0, 20)}...`),
          ...parsed.seeds.map(s => `Seed: ${s.slice(0, 30)}...`),
          ...parsed.shards.map(s => `Key Shard: ${s.slice(0, 30)}...`),
          ...parsed.passwords.map(p => `Possible Password: ${p}`)
        ].join('\n');
        if (extracted) setProofInput(prev => prev + (prev ? '\n\n' : '') + `--- Extracted from ${file.name} ---\n${extracted}`);
      } catch (err) {
        console.error(`Failed to parse ${file.name}`, err);
      }
    }
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Target Address Selection */}
      <div className="card-glass rounded-xl p-4 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            placeholder="Set specific recovery target address (Optional)"
            className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-2 text-sm text-white font-mono"
          />
          <button
            onClick={async () => {
              try {
                await fetch('http://127.0.0.1:8000/api/scan/start', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paths: ['/home/jules'], richlist: targetAddress || null }),
                });
              } catch (err) { console.error(err); }
            }}
            className="btn-neon px-4 py-2 rounded-lg text-xs flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            START TARGETED SCAN
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragActive(false); processFiles(Array.from(e.dataTransfer.files)); }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700/50 hover:border-cyan-500/30'
        }`}
      >
        <input type="file" multiple onChange={(e) => processFiles(Array.from(e.target.files || []))} className="hidden" id="ai-file-upload" />
        <label htmlFor="ai-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="w-10 h-10 text-cyan-400" />
          <span className="text-lg font-semibold text-white">Drag & Drop Wallet Files</span>
          <span className="text-sm text-gray-400">JSON, .dat, .txt, .log, .csv, shards</span>
        </label>
      </div>

      {/* AI Chat / Intelligence Window */}
      <div className="card-glass rounded-xl p-6 border border-cyan-500/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-white text-lg">AI Recovery Intelligence</h3>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-500">
            <Activity className="w-3 h-3 animate-pulse" />
            LIVE_FEED_ACTIVE
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px]">
          {/* Left: Input/Context */}
          <div className="flex flex-col gap-4">
            <textarea
              value={proofInput}
              onChange={(e) => setProofInput(e.target.value)}
              placeholder="Paste context, signed messages, or partial data here..."
              className="flex-1 bg-black/40 border border-gray-700/50 rounded-lg p-4 text-sm text-cyan-100 font-mono resize-none focus:outline-none focus:border-cyan-500/30"
            />
            <button className="btn-neon py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              PROCESS CONTEXT & RECOVER
            </button>
          </div>

          {/* Right: Live Discovery Log */}
          <div className="bg-black/60 rounded-lg p-4 font-mono text-xs text-cyan-300 overflow-y-auto space-y-2 border border-gray-800">
            {liveHits.length === 0 ? (
              <div className="text-gray-600 italic">Waiting for discovery events... Scan the PC or provide context to begin.</div>
            ) : (
              liveHits.map((hit, i) => (
                <div key={i} className="border-l-2 border-cyan-900 pl-3 py-1 bg-cyan-950/10">
                  <span className="text-gray-500">[{new Date(hit.timestamp || Date.now()).toLocaleTimeString()}]</span>{' '}
                  <span className="text-yellow-400 font-bold">{hit.artifact_type || hit.key_type}</span>{' '}
                  {hit.path && <><span className="text-gray-400">in</span> <span className="text-white break-all">{hit.path}</span></>}
                  {hit.total_usd > 0 && <span className="text-green-400 ml-2 font-bold animate-pulse">(${hit.total_usd.toFixed(2)})</span>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
