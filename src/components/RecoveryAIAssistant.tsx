import React, { useMemo, useState } from 'react';
import { Bot, BadgeCheck, ShieldCheck, Sparkles, ClipboardCheck, User } from 'lucide-react';
import { useRecoveryPool, PoolWallet } from '../context/RecoveryPoolContext';
import { generateRecoveryRecommendation } from '../utils/recoveryAssistant';

export function RecoveryAIAssistant() {
  const recoveryPool = useRecoveryPool();
  const [proofInput, setProofInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [verified, setVerified] = useState<boolean | null>(null);

  const selectedWallet = useMemo<PoolWallet | undefined>(
    () => recoveryPool.discoveredWallets.find((w) => w.id === selectedWalletId) as PoolWallet | undefined,
    [recoveryPool.discoveredWallets, selectedWalletId],
  );

  const recommendation = useMemo(
    () => generateRecoveryRecommendation(proofInput, selectedWallet),
    [proofInput, selectedWallet],
  );

  const handleAttachProof = async () => {
    if (!selectedWallet || !proofInput.trim()) return;
    recoveryPool.setOwnershipProof(selectedWallet.id, proofInput.trim());
    if (ownerInput.trim()) {
      recoveryPool.setWalletOwner(selectedWallet.id, ownerInput.trim());
    }
    const ok = await recoveryPool.verifyOwnership(selectedWallet.id);
    setVerified(ok);
  };

  return (
    <div className="card-glass rounded-xl p-6 border border-cyan-500/20 space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-cyan-300" />
        <h3 className="font-semibold text-white">AI Recovery Assistant</h3>
      </div>

      <p className="text-sm text-gray-300">
        Provide proof-of-ownership context and get a guided recovery plan with comprehensive derivation coverage.
      </p>

      <div className="space-y-3">
        <select
          value={selectedWalletId}
          onChange={(e) => {
            setSelectedWalletId(e.target.value);
            setVerified(null);
          }}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Select recovered wallet (optional)</option>
          {recoveryPool.discoveredWallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.network} · {wallet.address}
            </option>
          ))}
        </select>

        <input
          value={ownerInput}
          onChange={(e) => setOwnerInput(e.target.value)}
          placeholder="Owner label (name, case ID, or contact)"
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm"
        />

        <textarea
          value={proofInput}
          onChange={(e) => setProofInput(e.target.value)}
          placeholder="Paste signed message, TXID, address linkage, exchange record, or any proof material..."
          rows={4}
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm resize-y"
        />

        <button
          onClick={handleAttachProof}
          disabled={!selectedWalletId || !proofInput.trim()}
          className="btn-neon px-4 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Attach Proof & Verify Ownership
        </button>
      </div>

      <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-purple-300" />
          <span className="text-gray-200">{recommendation.summary}</span>
        </div>
        <div className="text-xs text-gray-400">Confidence: {recommendation.confidence.toUpperCase()}</div>

        {verified !== null && (
          <div className={`text-xs flex items-center gap-1 ${verified ? 'text-green-300' : 'text-yellow-300'}`}>
            {verified ? <BadgeCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            {verified ? 'Ownership verification passed.' : 'Ownership verification still needs stronger proof.'}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-cyan-300 mb-1 flex items-center gap-1"><ClipboardCheck className="w-3.5 h-3.5" />Key checks</div>
          <ul className="list-disc pl-4 text-gray-300 space-y-1">
            {recommendation.checks.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div className="bg-gray-900/40 border border-gray-700/50 rounded-lg p-3">
          <div className="text-emerald-300 mb-1 flex items-center gap-1"><User className="w-3.5 h-3.5" />Next actions</div>
          <ul className="list-disc pl-4 text-gray-300 space-y-1">
            {recommendation.nextActions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <details className="text-xs text-gray-300">
        <summary className="cursor-pointer text-cyan-300">Show derivation paths preview</summary>
        <div className="mt-2 grid md:grid-cols-2 gap-1 font-mono text-[11px]">
          {recommendation.derivationPaths.map((path) => (
            <code key={path} className="bg-gray-900/40 rounded px-2 py-1 border border-gray-700/30">{path}</code>
          ))}
        </div>
      </details>
    </div>
  );
}
