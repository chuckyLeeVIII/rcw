import React from 'react';
import {
  Key,
} from 'lucide-react';

import { WalletRecovery } from '../components/WalletRecovery';

export function RecoveryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
              <Key className="w-8 h-8 text-cyan-400" />
              Direct Wallet Recovery
            </h1>
            <p className="text-gray-400 mt-2">Manual entry and specialized recovery tools</p>
          </div>
        </div>
      </div>

      <WalletRecovery />
    </div>
  );
}
