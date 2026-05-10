import React, { useState } from 'react';
import { Search, Play, Pause, RotateCcw, ShieldAlert, FileCode } from 'lucide-react';

export function ComputerScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggleScan = () => {
    setIsScanning(!isScanning);
  };

  return (
    <div className="space-y-6">
      <div className="card-glass rounded-xl p-6 neon-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
              <Search className="w-8 h-8 text-cyan-400" />
              Computer Recovery Scan
            </h1>
            <p className="text-gray-400 mt-2">Deep-scan filesystem for lost wallets and encrypted keys</p>
          </div>
          <button
            onClick={toggleScan}
            className={`btn-neon flex items-center gap-2 px-6 py-3 ${isScanning ? 'bg-red-500/20 text-red-400' : ''}`}
          >
            {isScanning ? (
              <>
                <Pause className="w-5 h-5" /> Stop Scan
              </>
            ) : (
              <>
                <Play className="w-5 h-5" /> Start Scan
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h2 className="text-xl font-semibold text-white mb-4">Scan Progress</h2>
            <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
              <div
                className="bg-cyan-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Files Scanned: 0</span>
              <span>Artifacts Found: 0</span>
            </div>
          </div>

          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h2 className="text-xl font-semibold text-white mb-4">Live Discovery Log</h2>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm text-cyan-300 h-64 overflow-y-auto">
              {isScanning ? (
                <div className="animate-pulse">Searching /home/user/Documents...</div>
              ) : (
                <div className="text-gray-600">Scanner idle. Press start to begin.</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Scan Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Deep Scan Level</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white">
                  <option>Standard (Fast)</option>
                  <option>Comprehensive (Slower)</option>
                  <option>Paranoid (Deep analysis)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="richlist" className="rounded border-gray-700 bg-gray-800" />
                <label htmlFor="richlist" className="text-sm text-gray-300">Cross-reference Richlist</label>
              </div>
            </div>
          </div>

          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-purple-400" />
              Recent Artifacts
            </h3>
            <div className="text-sm text-gray-500 italic">No artifacts found yet.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
