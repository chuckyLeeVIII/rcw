import React, { useState } from 'react';
import { Search, Play, Pause, RotateCcw, ShieldAlert, FileCode } from 'lucide-react';

export function ComputerScanPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanPath, setScanPath] = useState('/home/jules');
  const [stats, setStats] = useState({ scanned: 0, found: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const toggleScan = async () => {
    if (!isScanning) {
      try {
        await fetch('http://127.0.0.1:8000/api/scan/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [scanPath] }),
        });
        setIsScanning(true);
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] Scan started on ${scanPath}`, ...prev]);
      } catch (err) {
        console.error('Failed to start scan:', err);
      }
    } else {
      try {
        await fetch('http://127.0.0.1:8000/api/scan/stop', { method: 'POST' });
        setIsScanning(false);
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] Scan stopped`, ...prev]);
      } catch (err) {
        console.error('Failed to stop scan:', err);
      }
    }
  };

  // Poll for status
  React.useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://127.0.0.1:8000/api/status');
          const data = await res.json();
          if (data.computer_scanner) {
            setStats({
              scanned: data.computer_scanner.files_scanned,
              found: data.computer_scanner.artifacts_found + data.computer_scanner.keys_extracted,
            });
            // Update progress - mock progress based on files scanned if total unknown
            setProgress(Math.min(99, (data.computer_scanner.files_scanned / 1000) * 100));
          }
        } catch (err) {
          console.error('Status poll failed:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

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
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Scan Path (e.g. /home/user)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white w-64"
              value={scanPath}
              onChange={(e) => setScanPath(e.target.value)}
            />
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
              <span>Files Scanned: {stats.scanned.toLocaleString()}</span>
              <span>Artifacts Found: {stats.found}</span>
            </div>
          </div>

          <div className="card-glass rounded-xl p-6 border border-gray-700/30">
            <h2 className="text-xl font-semibold text-white mb-4">Live Discovery Log</h2>
            <div className="bg-black/40 rounded-lg p-4 font-mono text-sm text-cyan-300 h-64 overflow-y-auto space-y-1">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              {isScanning && stats.scanned > 0 && (
                <div className="animate-pulse">Scanning... {stats.scanned} files processed</div>
              )}
              {!isScanning && logs.length === 0 && (
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
