import React from 'react';
import { Settings, User, Bell, Shield, Wallet } from 'lucide-react';
import { useRecoveryPool } from '../context/RecoveryPoolContext';
import { useKeyManagement } from '../context/KeyManagementContext';

export function SettingsPage() {
  const recoveryPool = useRecoveryPool();
  const keyManagement = useKeyManagement();
  const activeContract = keyManagement.selectedContract || keyManagement.contracts[0] || null;

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

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Active Recovery Pool
            </h3>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-gray-300">
              <div>Pool seed status: <span className="text-emerald-300">{recoveryPool.poolMasterSeed ? 'Active' : 'Not configured'}</span></div>
              <div>Discovered wallets in master list: <span className="text-white">{recoveryPool.discoveredWallets.length}</span></div>
              <div className="text-amber-300 mt-2">Safety: do not clear pool seed while this pool is active, to avoid accidental loss/deletion of active pool linkage.</div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-cyan-400" /> Active Contract Settings
            </h3>
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-gray-300">
              {activeContract ? (
                <>
                  <div>Name: <span className="text-white">{activeContract.name}</span></div>
                  <div>Network: <span className="text-white">{activeContract.network}</span></div>
                  <div className="break-all">Address: <span className="text-white">{activeContract.address}</span></div>
                </>
              ) : (
                <div>No active contract selected.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
