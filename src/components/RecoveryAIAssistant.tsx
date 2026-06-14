import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, Sparkles, Upload, Activity, Search, Send, Terminal, Shield, Zap, Target, User } from 'lucide-react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import { parseWalletFile, generateRecoveryRecommendation } from '../utils/recoveryAssistant';
import { getApiUrl } from '../utils/apiConfig';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [chatInput, setChatInput] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMixHunterRunning, setIsMixHunterRunning] = useState(false);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [isScreenWatcherRunning, setIsScreenWatcherRunning] = useState(false);
  const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [recoveryMatches, setRecoveryMatches] = useState(0);
  const [messages, setMessages] = useState<any[]>([
    { type: 'ai', text: 'SYSTEM READY. Provide recovery context, target addresses, or drag-and-drop wallet artifacts to begin deep-state analysis.', time: new Date() }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Intelligence Feed Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [hitsRes, statusRes] = await Promise.all([
          fetch(getApiUrl('/scan/results?limit=5')),
          fetch(getApiUrl('/status'))
        ]);
        const hitsData = await hitsRes.json();
        const statusData = await statusRes.json();

        if (hitsData.hits && hitsData.hits.length > 0) {
          hitsData.hits.forEach((hit: any) => {
            const hitMsg = {
              type: 'hit',
              text: `ARTIFACT_DISCOVERED: ${hit.artifact_type} in ${hit.path || 'STREAM'} - VALUE: $${(hit.total_usd || 0).toFixed(2)}`,
              time: new Date(hit.timestamp || Date.now())
            };
            setMessages(prev => {
              if (prev.some(m => m.text === hitMsg.text)) return prev;
              return [...prev, hitMsg];
            });
          });
        }

        if (statusData.computer_scanner) {
          setIsScannerRunning(statusData.computer_scanner.running);
          setRecoveryAttempts(statusData.computer_scanner.recovery_attempts || 0);
          setRecoveryMatches(statusData.computer_scanner.recovery_matches || 0);
        }
        if (statusData.agents) {
            if (statusData.agents.mixhunter) setIsMixHunterRunning(statusData.agents.mixhunter.running);
            if (statusData.agents.screen_watcher) setIsScreenWatcherRunning(statusData.agents.screen_watcher.running);
        }
      } catch (err) {
        console.error('Intelligence poll failure:', err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const input = chatInput.trim();
    if (!input) return;

    const userMsg = { type: 'user', text: input, time: new Date() };
    setMessages(prev => [...prev, userMsg]);

    if (input.toLowerCase() === 'start scan') {
        toggleScanner();
    } else if (input.toLowerCase().startsWith('/deep-search')) {
        setIsDeepSearchEnabled(true);
        const query = input.replace('/deep-search', '').trim();

        // Extract potential addresses from query
        const addressRegex = /(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})/g;
        const foundAddresses = query.match(addressRegex) || [];

        setMessages(prev => [...prev, {
            type: 'ai',
            text: `DEEP_SEARCH_ARMED: Exhaustive mutation engine active. ${foundAddresses.length > 0 ? `Targeting ${foundAddresses.length} addresses. ` : ''}Ingesting session intelligence...`,
            time: new Date()
        }]);

        // If addresses found, add them to richlist via API
        const sessionTokens = messages
            .filter(m => m.type === 'user')
            .map(m => m.text.replace(/^\/(deep-search|start scan|start mixhunter)\s*/i, '').trim())
            .concat([query])
            .filter(t => t.length > 0);

        try {
            await fetch(getApiUrl('/scan/start'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paths: ['.'],
                    richlist: foundAddresses.length > 0 ? foundAddresses.join(',') : undefined,
                    deep_scan: true,
                    recovery_tokens: sessionTokens
                    recovery_tokens: messages
                        .filter(m => m.type === 'user')
                        .map(m => m.text.replace(/^\/(deep-search|start scan|start mixhunter)\s*/i, '').trim())
                        .concat([query])
                        .filter(t => t.length > 0)
                }),
            });
            setIsScannerRunning(true);
        } catch (err) { console.error(err); }
    } else if (input.toLowerCase() === 'start mixhunter') {
        toggleMixHunter();
    } else if (/^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})$/.test(input)) {
      setMessages(prev => [...prev, { type: 'ai', text: `TARGET_LOCK_ACQUIRED: Initiating priority scan for ${input}...`, time: new Date() }]);
      try {
        await fetch(getApiUrl('/scan/start'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['.'], richlist: input }),
        });
      } catch (err) { console.error(err); }
    } else {
      // General context analysis
      const rec = generateRecoveryRecommendation(chatInput);
      setMessages(prev => [...prev, {
        type: 'ai',
        text: `ANALYSIS_COMPLETE: Confidence ${rec.confidence.toUpperCase()}. Suggested paths: ${rec.derivationPaths.slice(0, 3).join(', ')}...`,
        time: new Date()
      }]);

      // Extract intelligence and feed backend
      const words = input.toLowerCase().split(/\s+/);
      const stopWords = new Set(['the', 'this', 'that', 'with', 'from', 'lost', 'seed', 'help', 'have', 'find', 'like', 'words']);
      const tokens = words.filter(w => w.length >= 4 && !stopWords.has(w));
      const addressRegex = /\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})\b/g;
      const addresses = input.match(addressRegex) || [];

      if (tokens.length > 0 || addresses.length > 0) {
        try {
          await fetch(getApiUrl('/assistant/feed'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens,
                addresses,
                deep_scan: isDeepSearchEnabled
            })
          });
        } catch (err) {
          console.error('Failed to feed intelligence:', err);
        }
      }
    }

    // Dynamic Intelligence Feed (Automatic extraction)
    const addressRegex = /(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})/g;
    const extractedAddrs = input.match(addressRegex) || [];

    // Heuristic: Ignore common words to avoid flooding the backend
    const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'lost', 'seed', 'help', 'scan', 'start', 'deep', 'search', 'wallet', 'find']);
    const cleanTokens = input.split(/[\s,.;!]+/)
        .filter(t => t.length >= 4 && !extractedAddrs.includes(t) && !stopWords.has(t.toLowerCase()));

    if (extractedAddrs.length > 0 || cleanTokens.length > 0) {
        fetch(getApiUrl('/assistant/feed'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens: cleanTokens,
                addresses: extractedAddrs,
                deep_scan: isDeepSearchEnabled
            })
        }).catch(err => console.error('Intelligence feed error:', err));
    }

    setChatInput('');
  };

  const toggleScanner = async (forceDeep?: boolean) => {
    try {
      const deep = forceDeep ?? isDeepSearchEnabled;
      const endpoint = isScannerRunning ? 'stop' : 'start';

      // Aggregating session intelligence for scan start
      const sessionTokens = messages
        .filter(m => m.type === 'user')
        .map(m => m.text.replace(/^\/(deep-search|start scan|start mixhunter)\s*/i, '').trim())
        .filter(t => t.length > 0);

      // Extract all addresses from session
      const addressRegex = /\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})\b/g;
      const sessionAddresses = messages
        .filter(m => m.type === 'user')
        .flatMap(m => m.text.match(addressRegex) || []);
      const uniqueAddresses = Array.from(new Set(sessionAddresses));

      const body = isScannerRunning ? undefined : JSON.stringify({
        paths: ['.'],
        deep_scan: deep,
        richlist: uniqueAddresses.length > 0 ? uniqueAddresses.join(',') : undefined,
        recovery_tokens: sessionTokens
      });
      const res = await fetch(getApiUrl(`/scan/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const data = await res.json();
      setMessages(prev => [...prev, { type: 'ai', text: `SCANNER_CMD: ${data.status?.toUpperCase() || 'ERROR'}`, time: new Date() }]);
    } catch (err) { console.error(err); }
  };

  const toggleMixHunter = async () => {
    try {
      const endpoint = isMixHunterRunning ? 'stop' : 'start';
      const res = await fetch(getApiUrl(`/mixhunter/${endpoint}`), { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, { type: 'ai', text: `MIXHUNTER_CMD: ${data.status?.toUpperCase() || 'ERROR'}`, time: new Date() }]);
    } catch (err) { console.error(err); }
  };

  const toggleScreenWatcher = async () => {
    try {
      const endpoint = isScreenWatcherRunning ? 'stop' : 'start';
      const res = await fetch(getApiUrl(`/screenwatcher/${endpoint}`), { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, { type: 'ai', text: `SCREENWATCHER_CMD: ${data.status?.toUpperCase() || 'ERROR'}`, time: new Date() }]);
    } catch (err) { console.error(err); }
  };

  const processFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = parseWalletFile(text, file.name);
        const count = parsed.keys.length + parsed.seeds.length + parsed.shards.length + parsed.passwords.length + parsed.richlist.length;
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `DATA_INGESTED: ${file.name} - Extracted ${count} artifacts. ${parsed.richlist.length > 0 ? `Detected ${parsed.richlist.length} target addresses.` : ''} Syncing intelligence...`,
          time: new Date()
        }]);
        let recovered = 0;

        // Keys and key-like shards are treated as direct key material candidates.
        for (const key of [...parsed.keys, ...parsed.shards]) {
          const candidate = key.replace(/^Keystore:\s*/i, '').trim();
          if (!candidate || candidate.includes('xprv:')) continue;
          try {
            await recoveryPool.recoverFromPrivateKey(candidate);
            recovered += 1;
          } catch {
            // best-effort per artifact
          }
        }

        // Seeds are validated/balance-checked by recovery pool flow.
        for (const seed of parsed.seeds) {
          const cleaned = seed.replace(/^HD Wallet:\s*/i, '').trim();
          if (!cleaned || cleaned.startsWith('m/')) continue;
          try {
            await recoveryPool.recoverFromSeed(cleaned);
            recovered += 1;
          } catch {
            // best-effort per artifact
          }
        }

        // Feed tokens and addresses to backend scanner
        if (parsed.passwords.length > 0 || parsed.richlist.length > 0) {
            try {
                await fetch(getApiUrl('/assistant/feed'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tokens: parsed.passwords,
                        addresses: parsed.richlist,
                        deep_scan: isDeepSearchEnabled
                    })
                });
            } catch (err) { console.error('Artifact feed failure:', err); }
        }

        setMessages(prev => [...prev, {
          type: 'ai',
          text: `POOL_SYNC_COMPLETE: ${file.name} processed. ${parsed.richlist.length > 0 ? 'Targets added to richlist.' : ''} Recovered flows: ${recovered}.`,
          time: new Date()
        }]);
      } catch (err) {
        setMessages(prev => [...prev, { type: 'ai', text: `ERROR: Failed to parse ${file.name}`, time: new Date() }]);
      }
    }
  }, [recoveryPool]);

  return (
    <div className="flex flex-col h-[700px] bg-[#050810] border border-cyan-500/30 rounded-xl overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.1)]">
      {/* Cyberpunk Scanlines & Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* Header */}
      <div className="bg-cyan-950/20 border-b border-cyan-500/20 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Bot className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-cyan-400 tracking-widest text-sm uppercase">Recovery_Core_v5.0</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono">NEURAL_LINK_ESTABLISHED</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="text-right hidden md:block">
              <div className="text-[10px] text-cyan-700 font-mono">LATENCY: 24ms</div>
              <div className="text-[10px] text-cyan-700 font-mono">UPTIME: 99.99%</div>
           </div>
           <Shield className="w-5 h-5 text-cyan-900" />
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono z-10 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              m.type === 'user'
                ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-100'
                : m.type === 'hit'
                  ? 'bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs animate-in fade-in slide-in-from-left-2'
                  : 'bg-gray-900/60 border border-gray-800 text-cyan-300 text-sm'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px]">
                {m.type === 'user' ? <User className="w-3 h-3" /> : <Terminal className="w-3 h-3" />}
                <span>{m.time.toLocaleTimeString()}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">
                {m.type === 'hit' && <span className="bg-amber-400 text-black px-1 mr-2 font-bold uppercase text-[9px]">Alert</span>}
                {m.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Zone */}
      <div className="p-4 bg-cyan-950/10 border-t border-cyan-500/20 z-10">
        <div className="flex gap-3 items-end">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragActive(false); processFiles(Array.from(e.dataTransfer.files)); }}
            className={`p-3 rounded-lg border-2 border-dashed transition-all cursor-pointer flex-shrink-0 ${
              isDragActive ? 'border-cyan-400 bg-cyan-500/20' : 'border-gray-800 hover:border-cyan-500/30 bg-black/40'
            }`}
          >
            <Upload className={`w-6 h-6 ${isDragActive ? 'text-cyan-300 animate-bounce' : 'text-gray-600'}`} />
            <input type="file" multiple className="hidden" id="chat-file-upload" onChange={(e) => processFiles(Array.from(e.target.files || []))} />
          </div>

          <div className="flex-1 relative">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="ENTER_CONTEXT_OR_TARGET_ADDRESS..."
              className="w-full bg-black/60 border border-gray-800 rounded-xl px-4 py-3 text-cyan-300 placeholder-cyan-900 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 font-mono text-sm resize-none h-12 min-h-[48px]"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 hover:bg-cyan-500/30 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
        <div className="mt-3 flex gap-4 overflow-x-auto pb-1 text-[9px] font-mono text-cyan-900 uppercase tracking-widest">
           <div className={`flex items-center gap-1 cursor-pointer hover:text-purple-400 ${isMixHunterRunning ? 'text-purple-400' : ''}`} onClick={toggleMixHunter}><Zap className="w-3 h-3" /> MixHunter: {isMixHunterRunning ? 'ACTIVE' : 'IDLE'}</div>
           <div className={`flex items-center gap-1 cursor-pointer hover:text-emerald-400 ${isScreenWatcherRunning ? 'text-emerald-400' : ''}`} onClick={toggleScreenWatcher}><Activity className="w-3 h-3" /> ScreenWatcher: {isScreenWatcherRunning ? 'MONITORING' : 'IDLE'}</div>
           <div className={`flex items-center gap-1 cursor-pointer hover:text-cyan-400 ${isScannerRunning ? 'text-cyan-400' : ''}`} onClick={toggleScanner}><Search className="w-3 h-3" /> Scanner: {isScannerRunning ? 'RUNNING' : 'IDLE'}</div>
           <div
             className={`flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors ${isDeepSearchEnabled ? 'text-amber-400' : 'text-cyan-900'}`}
             onClick={() => setIsDeepSearchEnabled(!isDeepSearchEnabled)}
           >
             <Target className="w-3 h-3" /> Deep Search: {isDeepSearchEnabled ? 'ENABLED' : 'DISABLED'}
           </div>

           {(isScannerRunning || recoveryAttempts > 0) && (
             <div className="flex items-center gap-3 ml-auto">
               <div className="flex items-center gap-1 text-cyan-400">
                 <Activity className="w-3 h-3" /> Attempts: {recoveryAttempts.toLocaleString()}
               </div>
               <div className={recoveryMatches > 0 ? "flex items-center gap-1 text-emerald-400 animate-pulse" : "flex items-center gap-1 text-gray-500"}>
                 <Sparkles className="w-3 h-3" /> Matches: {recoveryMatches}
               </div>
             </div>
           )}
           {!isScannerRunning && !recoveryAttempts && <div className="flex items-center gap-1 ml-auto text-amber-900"><Target className="w-3 h-3" /> Targeted Search: ENABLED</div>}
        </div>
      </div>
    </div>
  );
}
