import React, { useState } from 'react';
import { RecoveryAIAssistant } from '../components/RecoveryAIAssistant';
import {
  Search,
  Cpu,
  ArrowRight,
  Bot,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function RecoveryPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'scan'>('ai');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
              <Bot className="w-8 h-8 text-cyan-400" />
              AI Recovery Assistant
            </h1>
            <p className="text-gray-400 mt-2">Present everything to the AI and use BTC recovery to search the PC</p>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">AI-Powered Recovery</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'ai'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800/70'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'scan'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800/70'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>BTC Recovery Scan</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Assistant - Full Width */}
          <RecoveryAIAssistant />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/scan"
              className="card-glass rounded-xl p-4 border border-gray-700/30 hover:border-cyan-500/40 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Search className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <div className="text-white font-medium">Computer Scan</div>
                  <div className="text-sm text-gray-400">Search PC for wallet files</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
              </div>
            </Link>

            <Link
              to="/pool"
              className="card-glass rounded-xl p-4 border border-gray-700/30 hover:border-purple-500/40 transition-all group"
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <div className="text-white font-medium">Recovery Pool</div>
                  <div className="text-sm text-gray-400">View all discovered wallets</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'scan' && (
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <div className="text-center py-12">
            <Cpu className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">BTC Recovery Scanner</h3>
            <p className="text-gray-400 mb-6">Advanced filesystem scanning for wallet files and keys</p>
            <Link
              to="/scan"
              className="btn-neon inline-flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Go to Scanner</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
