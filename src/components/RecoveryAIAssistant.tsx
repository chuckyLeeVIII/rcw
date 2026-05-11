import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, Sparkles, Upload, Activity, Search, Send, Terminal, Shield, Zap, Target } from 'lucide-react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import { parseWalletFile, generateRecoveryRecommendation } from '../utils/recoveryAssistant';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [chatInput, setChatInput] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isMixHunterRunning, setIsMixHunterRunning] = useState(false);
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [isScreenWatcherRunning, setIsScreenWatcherRunning] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    { type: 'ai', text: 'SYSTEM READY. Provide recovery context, target addresses, or drag-and-drop wallet artifacts to begin deep-state analysis.', time: new Date() }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Intelligence Feed Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [hitsRes, statusRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/scan/results?limit=5'),
          fetch('http://127.0.0.1:8000/api/status')
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

        if (statusData.computer_scanner) setIsScannerRunning(statusData.computer_scanner.running);
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
    } else if (input.toLowerCase() === 'start mixhunter') {
        toggleMixHunter();
    } else if (/^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})$/.test(input)) {
      setMessages(prev => [...prev, { type: 'ai', text: `TARGET_LOCK_ACQUIRED: Initiating priority scan for ${input}...`, time: new Date() }]);
      try {
        await fetch('http://127.0.0.1:8000/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: ['/home/jules'], richlist: input }),
        });
      } catch (err) { console.error(err); }
    } else {
      // Feed to backend for key extraction
      try {
        await fetch('http://127.0.0.1:8000/api/assistant/feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: input, source: 'ai_chat' }),
        });
      } catch (err) { console.error(err); }

      // General context analysis
      const rec = generateRecoveryRecommendation(chatInput);
      setMessages(prev => [...prev, {
        type: 'ai',
        text: `ANALYSIS_COMPLETE: Confidence ${rec.confidence.toUpperCase()}. Feeding to extraction engine. Suggested paths: ${rec.derivationPaths.slice(0, 3).join(', ')}...`,
        time: new Date()
      }]);
    }
    
    setChatInput('');
  };

  const toggleScanner = async () => {
    try {
      const endpoint = isScannerRunning ? 'stop' : 'start';
      const body = isScannerRunning ? undefined : JSON.stringify({ paths: ['/home/jules'] });
      const res = await fetch(`http://127.0.0.1:8000/api/scan/${endpoint}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/mixhunter/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, { type: 'ai', text: `MIXHUNTER_CMD: ${data.status?.toUpperCase() || 'ERROR'}`, time: new Date() }]);
    } catch (err) { console.error(err); }
  };

  const toggleScreenWatcher = async () => {
    try {
      const endpoint = isScreenWatcherRunning ? 'stop' : 'start';
      const res = await fetch(`http://127.0.0.1:8000/api/screenwatcher/${endpoint}`, { method: 'POST' });
      const data = await res.json();
      setMessages(prev => [...prev, { type: 'ai', text: `SCREENWATCHER_CMD: ${data.status?.toUpperCase() || 'ERROR'}`, time: new Date() }]);
    } catch (err) { console.error(err); }
  };

  const processFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      try {
        const text = await file.text();

        // Feed to backend for key extraction
        try {
          await fetch('http://127.0.0.1:8000/api/assistant/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, source: `file:${file.name}` }),
          });
        } catch (err) { console.error(err); }

        const parsed = parseWalletFile(text, file.name);
        const count = parsed.keys.length + parsed.seeds.length + parsed.shards.length + parsed.passwords.length;
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `DATA_INGESTED: ${file.name} - Extracted ${count} artifacts. Adding to recovery pool...`,
          time: new Date()
        }]);
      } catch (err) {
        setMessages(prev => [...prev, { type: 'ai', text: `ERROR: Failed to parse ${file.name}`, time: new Date() }]);
      }
    }
  }, []);

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
            <h3 className="font-bold text-cyan-400 tracking-widest text-sm uppercase">Recovery_Core_v4.2</h3>
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
           <div className="flex items-center gap-1 ml-auto text-amber-900"><Target className="w-3 h-3" /> Targeted Search: ENABLED</div>
        </div>
      </div>
    </div>
  );
}

function User(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
