import React from 'react';
import { WalletRecovery } from '../components/WalletRecovery';

export function RecoveryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Wallet Recovery</h1>
      <WalletRecovery />
    </div>
  );
}