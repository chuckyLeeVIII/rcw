import { PoolWallet } from '../context/RecoveryPoolContext';
import { SUPPORTED_NETWORKS } from '../types/recoveryPool';
import { getAllDerivationPathTemplates } from './recoveryEngine';

export interface ParsedWalletFile {
  keys: string[];
  seeds: string[];
  shards: string[];
  passwords: string[];
  richlist: string[];
  error?: string;
}

export function parseWalletFile(content: string, filename: string): ParsedWalletFile {
  const result: ParsedWalletFile = { keys: [], seeds: [], shards: [], passwords: [], richlist: [] };
  
  try {
    // Try JSON parsing first (MetaMask, MyEtherWallet, etc.)
    if (filename.endsWith('.json') || content.trim().startsWith('{')) {
      const json = JSON.parse(content);
      
      // MetaMask/MEW keystore
      if (json.crypto || json.Crypto) {
        result.keys.push(`Keystore: ${json.address || 'unknown'}`);
      }
      
      // Wallet backup with mnemonic
      if (json.mnemonic || json.seedPhrase || json.phrase) {
        result.seeds.push(json.mnemonic || json.seedPhrase || json.phrase);
      }
      
      // Array of keys
      if (Array.isArray(json)) {
        json.forEach((item: any) => {
          if (item.privateKey || item.wif || item.key) {
            result.keys.push(item.privateKey || item.wif || item.key);
          }
          if (item.mnemonic || item.seed) {
            result.seeds.push(item.mnemonic || item.seed);
          }
        });
      }
      
      // BIP39/HD wallet
      if (json.hdPath || json.derivationPath) {
        result.seeds.push(`HD Wallet: ${json.hdPath || json.derivationPath}`);
      }
      
      // Key shards (SSS)
      if (json.shares || json.shards || json.threshold) {
        const shards = json.shares || json.shards || [];
        if (Array.isArray(shards)) {
          result.shards.push(...shards);
        }
      }
    }
    
    // Text-based parsing for .txt, .key, .csv files
    const lines = content.split(/\r?\n/);
    
    const addressRegex = /^(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{8,87})$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Crypto Addresses (Richlist ingestion)
      if (addressRegex.test(trimmed)) {
        result.richlist.push(trimmed);
        continue;
      }

      // Private key (hex 64 chars)
      if (/^[a-f0-9]{64}$/i.test(trimmed)) {
        result.keys.push(trimmed);
        continue;
      }
      
      // WIF format (starts with 5, K, or L)
      if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(trimmed)) {
        result.keys.push(trimmed);
        continue;
      }
      
      // BIP39 mnemonic (12-24 words)
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount >= 12 && wordCount <= 24 && /^[a-z\s]+$/i.test(trimmed)) {
        result.seeds.push(trimmed);
        continue;
      }

      // Potential passwords (short strings, non-hex)
      if (trimmed.length > 4 && trimmed.length < 32 && !/^[a-f0-9]+$/i.test(trimmed)) {
        result.passwords.push(trimmed);
      }
      
      // Key shard format (base64-ish with share identifier)
      if (/share|shard|sss/i.test(trimmed) && trimmed.length > 20) {
        result.shards.push(trimmed);
        continue;
      }
      
      // Master key / xprv
      if (/^xprv[a-zA-Z0-9]{107,111}$/.test(trimmed) || /^[xyzt]prv/.test(trimmed)) {
        result.keys.push(`xprv: ${trimmed.slice(0, 20)}...`);
        continue;
      }
      
      // JSON lines
      if (trimmed.startsWith('{')) {
        try {
          const jsonLine = JSON.parse(trimmed);
          if (jsonLine.privateKey) result.keys.push(jsonLine.privateKey);
          if (jsonLine.wif) result.keys.push(jsonLine.wif);
          if (jsonLine.mnemonic) result.seeds.push(jsonLine.mnemonic);
        } catch { /* ignore */ }
      }
    }
    
    // CSV parsing
    if (filename.endsWith('.csv')) {
      const rows = content.split(/\r?\n/);
      for (const row of rows) {
        const cols = row.split(',');
        for (const col of cols) {
          const val = col.trim().replace(/^"|"$/g, '');
          if (/^[a-f0-9]{64}$/i.test(val)) result.keys.push(val);
          if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(val)) result.keys.push(val);
        }
      }
    }
    
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Parse error';
  }
  
  return result;
}

export interface AssistantRecommendation {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  checks: string[];
  nextActions: string[];
  derivationPaths: string[];
  ownershipSignals: string[];
}

function detectOwnershipSignals(proofText: string, wallet?: PoolWallet): string[] {
  const signals: string[] = [];
  const lower = proofText.toLowerCase();

  if (/0x[a-f0-9]{40}/i.test(proofText)) signals.push('Contains an EVM address');
  if (/[13][a-km-zA-HJ-NP-Z1-9]{25,34}/.test(proofText) || /bc1[ac-hj-np-z02-9]{8,87}/i.test(proofText)) {
    signals.push('Contains a Bitcoin-family address');
  }
  if (/([a-f0-9]{64})/i.test(proofText)) signals.push('Contains a possible TXID or signature hash');
  if (/signed|signature|message/.test(lower)) signals.push('Mentions signed message evidence');
  if (/seed|mnemonic|bip39/.test(lower)) signals.push('Mentions seed phrase ownership');
  if (/private key|wif/.test(lower)) signals.push('Mentions direct key control');
  if (wallet && proofText.includes(wallet.address)) signals.push('Proof explicitly references selected wallet address');

  return signals;
}

export function generateRecoveryRecommendation(proofText: string, wallet?: PoolWallet): AssistantRecommendation {
  const trimmedProof = proofText.trim();
  const ownershipSignals = detectOwnershipSignals(trimmedProof, wallet);

  const selectedNetwork = SUPPORTED_NETWORKS.find((n) => n.name === wallet?.network);
  const coinType = selectedNetwork?.coinType ?? 0;
  const derivationPaths = getAllDerivationPathTemplates(coinType).slice(0, 24);

  const checks: string[] = [
    'Cross-check recovered addresses against all known source artifacts (seed, WIF, raw key, wallet.dat).',
    'Scan both external and internal/change chains (m/.../0/* and m/.../1/*).',
    'Validate balances and transaction history after each derivation batch.',
  ];

  const nextActions: string[] = [
    'Run seed recovery with passphrase variations if a passphrase was ever used.',
    'Run private-key/WIF recovery to capture direct-control paths.',
    'Attach the ownership proof to the recovered wallet for later verification.',
  ];

  if (wallet) {
    checks.unshift(`Prioritize verification for ${wallet.network} ${wallet.address}.`);
    nextActions.unshift(`Set owner metadata for ${wallet.address} to keep audit trail clear.`);
  }

  if (trimmedProof.length > 180 && ownershipSignals.length >= 2) {
    return {
      summary: 'Proof appears strong enough to start with targeted ownership verification and comprehensive path scanning.',
      confidence: 'high',
      checks,
      nextActions,
      derivationPaths,
      ownershipSignals,
    };
  }

  if (ownershipSignals.length > 0) {
    return {
      summary: 'Proof includes partial ownership signals; proceed with broad derivation scan and signature verification steps.',
      confidence: 'medium',
      checks,
      nextActions,
      derivationPaths,
      ownershipSignals,
    };
  }

  return {
    summary: 'Proof is currently weak. Add signed-message or tx-linked evidence, then retry assisted recovery.',
    confidence: 'low',
    checks,
    nextActions,
    derivationPaths,
    ownershipSignals,
  };
}
