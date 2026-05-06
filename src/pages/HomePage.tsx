import React from 'react';
import { RecoveryAIAssistant } from '../components/RecoveryAIAssistant';
import {
  Bot,
  ShieldCheck,
} from 'lucide-react';

export function HomePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold text-gradient">AI Recovery Master Ledger</h1>
              <p className="text-gray-400 mt-2">Present everything to the AI and use BTC recovery to search the PC</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-400">AI-Powered Recovery</span>
          </div>
        </div>
      </div>

      {/* Main AI Assistant Interface - Full Width */}
      <RecoveryAIAssistant />
    </div>
  );
}
