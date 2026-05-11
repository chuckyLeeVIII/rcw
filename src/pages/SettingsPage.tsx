import React from 'react';
import { Settings, User, Bell, Shield, Wallet } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="card-glass rounded-xl p-6 neon-border">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400" />
          Settings
        </h1>
      </div>

      <div className="card-glass rounded-xl p-6 border border-gray-700/30">
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" /> Profile Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Username" className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white" />
              <input type="email" placeholder="Email" className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white" />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" /> Default Currency
            </h3>
            <select className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 text-white w-full max-w-xs">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
              <option>BTC</option>
            </select>
          </section>
        </div>
      </div>
    </div>
  );
}
