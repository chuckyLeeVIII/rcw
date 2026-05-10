import React from 'react';
import { Shield, Lock, Eye, Key } from 'lucide-react';

export function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="card-glass rounded-xl p-6 neon-border">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400" />
          Security Center
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <div className="flex items-center gap-4 mb-4">
            <Lock className="w-8 h-8 text-emerald-400" />
            <h3 className="text-xl font-semibold text-white">Vault Encryption</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Your vault is currently encrypted using AES-256-GCM. Your master key never leaves this device.
          </p>
          <button className="btn-neon text-sm py-2 px-4">Rotate Master Key</button>
        </div>

        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <div className="flex items-center gap-4 mb-4">
            <Key className="w-8 h-8 text-purple-400" />
            <h3 className="text-xl font-semibold text-white">2FA Recovery</h3>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Set up secondary authentication for high-value recoveries and outbound transfers.
          </p>
          <button className="btn-neon text-sm py-2 px-4">Setup 2FA</button>
        </div>
      </div>
    </div>
  );
}
