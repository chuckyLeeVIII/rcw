import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { WalletConnectProvider, useWalletConnect } from '../context/WalletConnectContext';
import { Wallet, Zap, ChevronDown, Copy, ExternalLink, LogOut, Activity, QrCode } from 'lucide-react';
import { WalletConnectQRModal } from './WalletConnectQRModal';

function NavbarContent() {
  const { address, isConnected, connect, disconnect } = useWallet();
  const walletConnect = useWalletConnect();
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const copyAddress = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  return (
    <>
      <nav className="border-b border-purple-500/10 glass-strong z-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Network & Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg" style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-emerald-400">Mainnet</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Activity className="w-4 h-4" />
                <span>Gas: 23 gwei</span>
              </div>
            </div>

            {/* Right - Wallet */}
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <div className="relative group">
                  <button
                    onClick={disconnect}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.1))',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-mono text-sm text-purple-300">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-64 glass-strong rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50" style={{
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                  }}>
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Connected Address</div>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs font-mono text-gray-300 flex-1 break-all">{address}</code>
                          <button onClick={(e) => { e.stopPropagation(); copyAddress(); }} className="p-1 hover:bg-gray-700 rounded">
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Network</span>
                        <span className="text-emerald-400">Ethereum</span>
                      </div>
                      <hr className="border-gray-700/50" />
                      <button
                        onClick={(e) => { e.stopPropagation(); disconnect(); }}
                        className="w-full flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      try {
                        setShowWalletConnect(true);
                        await walletConnect.connect();
                      } catch (err) {
                        console.error('WalletConnect failed:', err);
                        setShowWalletConnect(false);
                      }
                    }}
                    className="btn-neon flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(139,92,246,0.15))',
                      border: '1px solid rgba(168,85,247,0.3)',
                    }}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </button>
                  <button
                    onClick={connect}
                    className="btn-neon flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">MetaMask</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <WalletConnectQRModal
        isOpen={showWalletConnect}
        onClose={() => setShowWalletConnect(false)}
      />
    </>
  );
}

export function Navbar() {
  return (
    <WalletConnectProvider>
      <NavbarContent />
    </WalletConnectProvider>
  );
}
