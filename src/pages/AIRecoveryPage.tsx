import React from 'react';
import { RecoveryAIAssistant } from '../components/RecoveryAIAssistant';
import { Bot, ShieldCheck, Sparkles, Brain, Zap, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIRecoveryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass rounded-xl p-6 neon-border relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Brain className="w-32 h-32 text-cyan-400" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-xl">
                <Bot className="w-10 h-10 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gradient">AI Recovery Hub</h1>
                <p className="text-gray-400 mt-1">Autonomous intelligence for multi-chain asset restoration</p>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">AI Engine Active</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-2 font-mono">NEURAL_NET_V4.2_READY</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Intelligence Level</div>
              <div className="text-lg font-bold text-cyan-300">Level 4 Autonomous</div>
            </div>
            <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Success Probability</div>
              <div className="text-lg font-bold text-emerald-400">98.4% Optimized</div>
            </div>
            <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Derivation Coverage</div>
              <div className="text-lg font-bold text-purple-400">Full Standard + Custom</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main Assistant Column */}
        <div className="xl:col-span-3 space-y-6">
          <RecoveryAIAssistant />

          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Advanced AI Capabilities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <h3 className="text-cyan-300 font-medium mb-1">SSS Reconstruction</h3>
                <p className="text-xs text-gray-400">Automatically identifies and merges Shamir Secret Sharing shards found during scans.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <h3 className="text-emerald-300 font-medium mb-1">Entropy Analysis</h3>
                <p className="text-xs text-gray-400">Deep analysis of partial seeds to predict missing words based on BIP39 checksums.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <h3 className="text-purple-300 font-medium mb-1">Pattern Matching</h3>
                <p className="text-xs text-gray-400">Regex-based scanning of raw binary data for obfuscated private key material.</p>
              </div>
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <h3 className="text-amber-300 font-medium mb-1">Cross-Chain Correlation</h3>
                <p className="text-xs text-gray-400">Links discovered addresses across all 8 supported chains to build full wallet profiles.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar/Utility Column */}
        <div className="space-y-6">
          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Link to="/scan" className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm text-gray-200">Start Scan</span>
                </div>
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
              </Link>
              <Link to="/pool" className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-gray-200">View Pool</span>
                </div>
              </Link>
            </div>
          </div>

          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h3 className="text-lg font-semibold text-white mb-2 text-gradient-red">OPSEC Warning</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Always ensure you are in a private environment when performing AI-assisted recovery.
              The system scans for local leaks, but your physical screen remains a vulnerability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
