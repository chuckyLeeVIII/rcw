import React from 'react';
import { X, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uri?: string;
}

export function WalletConnectQRModal({ isOpen, onClose, uri }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card-glass w-full max-w-sm rounded-2xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <QrCode className="text-cyan-400" />
            Connect Wallet
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl mb-6">
          <div className="aspect-square bg-gray-200 rounded flex items-center justify-center text-gray-500">
            {/* Real QR would go here */}
            [QR CODE: {(uri || 'wc://active-recovery-pool').slice(0, 28)}...]
          </div>
        </div>

        <p className="text-sm text-gray-400 text-center">
          Scan this QR code with a WalletConnect-compatible wallet (like MetaMask or Trust Wallet) to connect.
        </p>
      </div>
    </div>
  );
}
