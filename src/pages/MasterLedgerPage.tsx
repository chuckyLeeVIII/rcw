import React from 'react';
import { Database, Shield, Download, Search } from 'lucide-react';

export function MasterLedgerPage() {
  return (
    <div className="space-y-6">
      <div className="card-glass rounded-xl p-6 neon-border">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <Database className="w-8 h-8 text-cyan-400" />
          Master Ledger
        </h1>
        <p className="text-gray-400 mt-2">Unified view of all indexed blockchain data and recovered assets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <Shield className="w-10 h-10 text-cyan-400 mb-4" />
          <h3 className="text-lg font-semibold text-white">Verified Assets</h3>
          <p className="text-3xl font-bold text-cyan-400 mt-2">0</p>
        </div>
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <Search className="w-10 h-10 text-purple-400 mb-4" />
          <h3 className="text-lg font-semibold text-white">Indexed Addresses</h3>
          <p className="text-3xl font-bold text-purple-400 mt-2">1,240</p>
        </div>
        <div className="card-glass rounded-xl p-6 border border-gray-700/30">
          <Download className="w-10 h-10 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-white">Total Value</h3>
          <p className="text-3xl font-bold text-emerald-400 mt-2">$0.00</p>
        </div>
      </div>

      <div className="card-glass rounded-xl p-6 border border-gray-700/30">
        <h2 className="text-xl font-semibold text-white mb-4">Ledger Entries</h2>
        <div className="text-center py-20 text-gray-500">
          No entries found in the master ledger.
        </div>
      </div>
    </div>
  );
}
