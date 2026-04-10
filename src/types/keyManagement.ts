// Key Management Types

export type KeyType = 'ethereum' | 'bitcoin' | 'generic';
export type KeyFormat = 'hex' | 'wif' | 'mnemonic' | 'json';
export type KeyUsage = 'signing' | 'encryption' | 'auth' | 'general';
export type KeyEncryption = 'none' | 'aes-256-gcm' | 'pbkdf2' | 'scrypt';

export interface CryptoKey {
  id: string;
  label: string;
  type: KeyType;
  format: KeyFormat;
  usage: KeyUsage;
  address?: string;
  publicKey: string;
  privateKey?: string;
  privateKeyEncrypted?: string;
  mnemonic?: string;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
  isEncrypted: boolean;
  encryption?: KeyEncryption;
  network?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface KeyGenerationParams {
  type: KeyType;
  label: string;
  network?: string;
  usage?: KeyUsage;
  passphrase?: string;
  tags?: string[];
}

export interface KeyImportParams {
  type: KeyType;
  label: string;
  data: string;
  format: KeyFormat;
  network?: string;
  passphrase?: string;
  tags?: string[];
}

export interface KeyExportData {
  key: CryptoKey;
  privateKey: string;
  mnemonic?: string;
  format: KeyFormat;
}

export interface Contract {
  id: string;
  name: string;
  address: string;
  abi: any[];
  network: string;
  bytecode?: string;
  deployedAt: number;
  creator?: string;
  txHash?: string;
  verified: boolean;
  functions: ContractFunction[];
  events: ContractEvent[];
  balance?: string;
  isProxy?: boolean;
  implementation?: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface ContractFunction {
  name: string;
  type: 'function' | 'constructor' | 'fallback' | 'receive';
  stateMutability: 'view' | 'pure' | 'payable' | 'nonpayable';
  inputs: ParamDefinition[];
  outputs: ParamDefinition[];
  gas?: number;
}

export interface ContractEvent {
  name: string;
  inputs: ParamDefinition[];
  anonymous: boolean;
}

export interface ParamDefinition {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
}

export interface ContractInteraction {
  id: string;
  contractId: string;
  functionName: string;
  params: any[];
  value?: string;
  txHash?: string;
  result?: any;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: number;
  error?: string;
}

export interface DeployParams {
  name: string;
  abi: string;
  bytecode: string;
  network: string;
  constructorParams?: any[];
  value?: string;
  gasLimit?: string;
}

export interface InteractionParams {
  contractId: string;
  functionName: string;
  params: any[];
  value?: string;
  gasLimit?: string;
}

export type NetworkType = 'mainnet' | 'testnet' | 'custom';

export const NETWORKS = [
  { id: 'eth-mainnet', name: 'Ethereum Mainnet', chainId: 1, rpc: 'https://eth.llamarpc.com', symbol: 'ETH', type: 'mainnet' as const },
  { id: 'eth-sepolia', name: 'Ethereum Sepolia', chainId: 11155111, rpc: 'https://sepolia.infura.io/v3/', symbol: 'ETH', type: 'testnet' as const },
  { id: 'eth-goerli', name: 'Ethereum Goerli', chainId: 5, rpc: 'https://goerli.infura.io/v3/', symbol: 'ETH', type: 'testnet' as const },
  { id: 'polygon', name: 'Polygon', chainId: 137, rpc: 'https://polygon-rpc.com', symbol: 'MATIC', type: 'mainnet' as const },
  { id: 'arbitrum', name: 'Arbitrum One', chainId: 42161, rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', type: 'mainnet' as const },
  { id: 'optimism', name: 'Optimism', chainId: 10, rpc: 'https://mainnet.optimism.io', symbol: 'ETH', type: 'mainnet' as const },
  { id: 'bsc', name: 'BNB Smart Chain', chainId: 56, rpc: 'https://bsc-dataseed.binance.org', symbol: 'BNB', type: 'mainnet' as const },
  { id: 'avalanche', name: 'Avalanche C-Chain', chainId: 43114, rpc: 'https://api.avax.network/ext/bc/C/rpc', symbol: 'AVAX', type: 'mainnet' as const },
  { id: 'base', name: 'Base', chainId: 8453, rpc: 'https://mainnet.base.org', symbol: 'ETH', type: 'mainnet' as const },
];
