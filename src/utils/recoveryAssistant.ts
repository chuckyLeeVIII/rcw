import { PoolWallet } from '../context/RecoveryPoolContext';
import { SUPPORTED_NETWORKS } from '../types/recoveryPool';
import { getAllDerivationPathTemplates } from './recoveryEngine';

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
