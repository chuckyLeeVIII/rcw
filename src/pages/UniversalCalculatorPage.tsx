import React, { useMemo, useState } from 'react';
import { Calculator, Copy, RefreshCw, Minus, Plus } from 'lucide-react';
import { calculateUniversalKey, detectInputKind, incrementPrivateKey, InputKind } from '../utils/universalKeyCalculator';

export function UniversalCalculatorPage() {
  const [input, setInput] = useState('0000000000000000000000000000000000000000000000000000000000000001');
  const [forceKind, setForceKind] = useState<'auto' | InputKind>('auto');
  const [error, setError] = useState<string | null>(null);

  const result = useMemo(() => {
    try {
      setError(null);
      return calculateUniversalKey(input, forceKind === 'auto' ? undefined : forceKind);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate key.');
      return null;
    }
  }, [input, forceKind]);

  const inferred = useMemo(() => detectInputKind(input), [input]);

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  const step = (delta: 1n | -1n) => {
    if (!result) return;
    setInput(incrementPrivateKey(result.privateKeyHex, delta));
    setForceKind('hex');
  };

  const row = (label: string, value: string) => (
    <div className="bg-gray-900/40 border border-gray-700/40 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-start gap-2">
        <code className="text-xs break-all text-gray-200 flex-1">{value}</code>
        <button onClick={() => copy(value)} className="p-1.5 rounded hover:bg-gray-700/50">
          <Copy className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
          <Calculator className="w-7 h-7" /> Universal Key Calculator
        </h1>
        <p className="text-gray-400 mt-2">Local calculator for HEX/WIF/decimal/binary/mnemonic/brainwallet conversions and address derivation.</p>
      </div>

      <div className="card-glass rounded-xl p-5 space-y-4 border border-cyan-500/20">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Input</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value.trim())}
            rows={3}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="Private key, WIF, mnemonic, decimal, binary, or brainwallet phrase"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Input Type</label>
            <select value={forceKind} onChange={(e) => setForceKind(e.target.value as any)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm">
              <option value="auto">Auto detect ({inferred})</option>
              <option value="hex">HEX</option>
              <option value="wif">WIF</option>
              <option value="decimal">Decimal</option>
              <option value="binary">Binary</option>
              <option value="mnemonic">Mnemonic</option>
              <option value="brainwallet">Brainwallet</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => step(-1n)} disabled={!result} className="btn-neon px-3 py-2 rounded-lg text-sm disabled:opacity-40"><Minus className="w-4 h-4 inline mr-1" />-1</button>
            <button onClick={() => step(1n)} disabled={!result} className="btn-neon px-3 py-2 rounded-lg text-sm disabled:opacity-40"><Plus className="w-4 h-4 inline mr-1" />+1</button>
            <button onClick={() => setInput(input)} className="btn-neon px-3 py-2 rounded-lg text-sm"><RefreshCw className="w-4 h-4 inline mr-1" />Recalc</button>
          </div>
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
      </div>

      {result && (
        <div className="grid lg:grid-cols-2 gap-4">
          {row('Private Key HEX', result.privateKeyHex)}
          {row('Private Key WIF', result.wif)}
          {row('Private Key Decimal', result.privateKeyDecimal)}
          {row('Private Key Binary', result.privateKeyBinary)}
          {row('Public Key (Compressed)', result.compressedPublicKey)}
          {row('Public Key (Uncompressed)', result.uncompressedPublicKey)}
          {row('BTC Legacy (P2PKH)', result.addresses.bitcoinLegacy)}
          {row('BTC SegWit (Bech32)', result.addresses.bitcoinSegwit)}
          {row('BTC Nested SegWit (P2SH-P2WPKH)', result.addresses.bitcoinNestedSegwit)}
          {row('BTC Taproot (P2TR)', result.addresses.bitcoinTaproot || '')}
          {row('Ethereum Address', result.addresses.ethereum)}
          {row('BNB Address', result.addresses.bnb)}
          {row('TRON Address', result.addresses.tron)}
          {result.derivationPath ? row('Derivation Path', result.derivationPath) : null}
        </div>
      )}
    </div>
  );
}
