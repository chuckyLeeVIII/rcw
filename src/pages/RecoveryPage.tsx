import React from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Wallet,
  Search,
  Shield,
  Cpu,
  Database,
  Lock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { WalletRecovery } from '../components/WalletRecovery';

const features = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'BIP39/BIP44 Support',
    description: 'Full compatibility with standard mnemonic phrases and derivation paths.',
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: 'Advanced Decryption',
    description: 'Recover wallets from encrypted master keys with custom parameters.',
  },
  {
    icon: <Database className="w-6 h-6" />,
    title: 'PyWallet Parsing',
    description: 'Extract keys from Bitcoin Core wallet.dat files and encrypted backups.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Brute Force Recovery',
    description: 'Recover partially known keys with configurable character sets.',
  },
  {
    icon: <Cpu className="w-6 h-6" />,
    title: 'AI Proof Assistant',
    description: 'Attach proof-of-ownership evidence and receive guided recovery actions.',
  },
];

export function RecoveryPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-3">
          <KeyRound className="w-8 h-8" />
          Wallet Recovery
        </h1>
        <p className="text-gray-400 mt-2">
          Recover lost wallets using multiple methods — from seed phrases to advanced key derivation.
        </p>
      </div>

      {/* Main Recovery Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Recovery */}
        <div className="card-glass rounded-xl p-6 neon-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Wallet className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gradient-green">Quick Recovery</h2>
              <p className="text-sm text-gray-400">Recover from seeds, keys, or wallet files</p>
            </div>
          </div>
          <WalletRecovery />
        </div>

        {/* Advanced Recovery */}
        <div className="card-glass rounded-xl p-6 neon-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Search className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gradient">Advanced Recovery</h2>
              <p className="text-sm text-gray-400">Multi-network scanning and pool management</p>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              The Advanced Recovery Pool scans discovered wallets across multiple networks simultaneously.
              Derive wallets from seed phrases or private keys and check balances on BTC, ETH, LTC, DOGE, DASH, and more.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Supported Networks</p>
                <p className="text-lg font-bold text-gradient">10+</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <p className="text-xs text-gray-400">Derivation Paths</p>
                <p className="text-lg font-bold text-gradient-green">BIP44/49/84</p>
              </div>
            </div>
            <Link
              to="/pool"
              className="btn-neon w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium"
            >
              Open Recovery Pool
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div>
        <h2 className="text-xl font-bold text-gradient-green mb-4">Recovery Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-glass rounded-xl p-5 neon-border hover:border-cyan-400/40 transition-all duration-300"
            >
              <div className="text-cyan-400 mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Warning */}
      <div className="card-glass rounded-xl p-5 border border-yellow-500/30">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-400 mb-1">Security Notice</h3>
            <p className="text-sm text-gray-300">
              All recovery operations run locally in your browser. No data is sent to external servers.
              Never share your seed phrases or private keys with anyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
