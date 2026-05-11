// ─── App Configuration ────────────────────────────────────────────────────

export const APP_CONFIG = {
  name: 'PyGUI Wallet',
  version: '1.0.0',
} as const;

// ─── API Keys (real production keys) ──────────────────────────────────────
export const API_KEYS = {
  INFURA_PROJECT_ID: '551b8fc7c4ec469180ae9ee774844b4b',
  ETHERSCAN_API_KEY: import.meta.env.VITE_ETHERSCAN_API_KEY || '',
  BLOCKCYPHER_TOKEN: import.meta.env.VITE_BLOCKCYPHER_TOKEN || '',
  OPENSEA_API_KEY: import.meta.env.VITE_OPENSEA_API_KEY || '',
  ALCHEMY_API_KEY: import.meta.env.VITE_ALCHEMY_API_KEY || '',
  WALLETCONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'e0397c27c421097b2d5c812d0220b0ca',
} as const;

// ─── Dev Fees (percentages as decimals) ───────────────────────────────────
export const DEV_FEES = {
  TRANSFER: 0.02,     // 2% on all transfers/sends
  RECOVERY: 0.02,     // 2% on all recovered funds
  WITHDRAWAL: 0.02,   // 2% on all withdrawals
  BRIDGING: 0.02,     // 2% on all bridging operations
} as const;

// ─── Dev Fee Wallet (Deposit Addresses) ──────────────────────────────────
// Funds collected via dev fees go here. Overridable via environment variables.
export const DEV_FEE_ADDRESS_ETH = import.meta.env.VITE_DEV_FEE_ADDRESS_ETH || '0x2d03B56989dE9E5c66CBcA7D3525Ad1B5178A7F1';
export const DEV_FEE_ADDRESS_BTC = import.meta.env.VITE_DEV_FEE_ADDRESS_BTC || '1PRQwKHJ4gsZ5Mou3xNkSMrHjBgNbD2E8A';
export const DEV_FEE_ADDRESS_DOGE = import.meta.env.VITE_DEV_FEE_ADDRESS_DOGE || 'DMpVUK7YGXfb3Esy6ujBrWEvDKDLeHNSih';
export const DEV_FEE_ADDRESS_LTC = import.meta.env.VITE_DEV_FEE_ADDRESS_LTC || 'LZB5znAUsU35q1K3UfoGmcdwPdnneaQNqv';

export const DEV_FEE_ADDRESS = DEV_FEE_ADDRESS_ETH; // Default for backwards compatibility

// ─── Infura RPC URLs ──────────────────────────────────────────────────────
export const INFURA_RPC = {
  mainnet: `https://mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  sepolia: `https://sepolia.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  polygon: `https://polygon-mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  arbitrum: `https://arbitrum-mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  optimism: `https://optimism-mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  goerli: `https://goerli.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  base: `https://base-mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
  avalanche: `https://avalanche-mainnet.infura.io/v3/${API_KEYS.INFURA_PROJECT_ID}`,
} as const;

// ─── Network Configuration ────────────────────────────────────────────────
export const NETWORKS = [
  { id: 'eth-mainnet', name: 'Ethereum Mainnet', chainId: 1, rpc: INFURA_RPC.mainnet, symbol: 'ETH', type: 'mainnet' as const, explorer: 'https://etherscan.io' },
  { id: 'eth-sepolia', name: 'Ethereum Sepolia', chainId: 11155111, rpc: INFURA_RPC.sepolia, symbol: 'ETH', type: 'testnet' as const, explorer: 'https://sepolia.etherscan.io' },
  { id: 'polygon', name: 'Polygon', chainId: 137, rpc: INFURA_RPC.polygon, symbol: 'MATIC', type: 'mainnet' as const, explorer: 'https://polygonscan.com' },
  { id: 'arbitrum', name: 'Arbitrum One', chainId: 42161, rpc: INFURA_RPC.arbitrum, symbol: 'ETH', type: 'mainnet' as const, explorer: 'https://arbiscan.io' },
  { id: 'optimism', name: 'Optimism', chainId: 10, rpc: INFURA_RPC.optimism, symbol: 'ETH', type: 'mainnet' as const, explorer: 'https://optimistic.etherscan.io' },
  { id: 'base', name: 'Base', chainId: 8453, rpc: 'https://mainnet.base.org', symbol: 'ETH', type: 'mainnet' as const, explorer: 'https://basescan.org' },
  { id: 'bsc', name: 'BNB Smart Chain', chainId: 56, rpc: 'https://bsc-dataseed.binance.org', symbol: 'BNB', type: 'mainnet' as const, explorer: 'https://bscscan.com' },
  { id: 'avalanche', name: 'Avalanche C-Chain', chainId: 43114, rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', type: 'mainnet' as const, explorer: 'https://snowtrace.io' },
] as const;

// ─── Utility Functions ────────────────────────────────────────────────────
export function calcDevFee(amount: number, feeType: 'TRANSFER' | 'RECOVERY' | 'WITHDRAWAL'): number {
  const fee = DEV_FEES[feeType];
  return amount * fee;
}

export function calcNetAmount(amount: number, feeType: 'TRANSFER' | 'RECOVERY' | 'WITHDRAWAL'): number {
  return amount - calcDevFee(amount, feeType);
}

// Recovery network explorers (maps recoveryPool network IDs to explorer URLs)
const RECOVERY_EXPLORERS: Record<string, string> = {
  bitcoin: 'https://blockchair.com/bitcoin',
  'bitcoin-testnet': 'https://blockchair.com/bitcoin/testnet',
  litecoin: 'https://blockchair.com/litecoin',
  dogecoin: 'https://blockchair.com/dogecoin',
  dash: 'https://blockchair.com/dash',
  ethereum: 'https://etherscan.io',
  'ethereum-classic': 'https://blockchair.com/ethereum-classic',
  'bitcoin-cash': 'https://blockchair.com/bitcoin-cash',
};

export function getExplorerUrl(networkId: string, txHash: string): string {
  const network = NETWORKS.find(n => n.id === networkId);
  if (network) return `${network.explorer}/tx/${txHash}`;
  const recoveryExplorer = RECOVERY_EXPLORERS[networkId];
  if (recoveryExplorer) return `${recoveryExplorer}/address/${txHash}`;
  return '';
}

export function getNetworkRpc(networkId: string): string {
  const network = NETWORKS.find(n => n.id === networkId);
  return network?.rpc || INFURA_RPC.mainnet;
}
