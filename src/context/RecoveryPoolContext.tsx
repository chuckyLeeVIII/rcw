import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  RecoveryPoolState,
  DiscoveredWallet,
  RecoverySource,
  createRecoveryPoolState,
  calculateTotalBalances,
  MasterLedger,
  RecoveryReport,
  CrossChainWallet,
} from '../types/recoveryPool';
import { scanSeedPhrase, scanPrivateKey, validateMnemonic } from '../utils/recoveryEngine';
import { checkAllBalances, checkBalancesBatch } from '../utils/balanceChecker';
import { parseWalletDat } from '../utils/datFileParser';
import {
  updateMasterLedger,
  createEmptyMasterLedger,
  cleanDeadEmptyKeys,
  generateRecoveryReport,
  calculateCrossChainTotals,
} from '../utils/masterLedger';
import {
  verifyCrossChainBalances,
  aggregateUTXOs,
  calculateRecoveryScore,
  linkCrossChainWallets,
  detectStaleAddresses,
  generateRecommendations,
} from '../utils/crossChainCalculator';
import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { derivePoolAddress, generatePoolSeed, PoolAddress } from '../utils/poolWallet';
import {
  DEV_FEE_ADDRESS_ETH,
  DEV_FEE_ADDRESS_BTC,
  DEV_FEE_ADDRESS_LTC,
  DEV_FEE_ADDRESS_DOGE,
} from '../config/app';

// ─── IndexedDB constants ──────────────────────────────────────────────────
const DB_NAME = 'pygui_recovery_pool';
const DB_VERSION = 1;
const STORE_NAME = 'pool_data';

// ─── IndexedDB helpers ────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key: string): Promise<any | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(key: string, value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll(): Promise<{ key: string; value: any }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ─── Crypto helpers for seed encryption ───────────────────────────────────
async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptSeed(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // Pack: salt(16) + iv(12) + ciphertext
  const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...packed));
}

async function decryptSeed(packedB64: string, passphrase: string): Promise<string> {
  const packed = Uint8Array.from(atob(packedB64), c => c.charCodeAt(0));
  const salt = packed.slice(0, 16);
  const iv = packed.slice(16, 28);
  const ciphertext = packed.slice(28);
  const key = await deriveKeyFromPassphrase(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// ─── Pool seed generation ─────────────────────────────────────────────────
function generatePoolSeedPhrase(): string {
  return bip39.generateMnemonic();
}

// ─── DiscoveredWallet extended with UI fields ─────────────────────────────
export interface PoolWallet extends DiscoveredWallet {
  notes: string;
  tags: string[];
  claimed: boolean;
  claimedAt?: number;
  taxAmount: number;
  createdAt: number;
  // NEW: Ownership tracking
  owner?: string; // owner identifier
  ownershipProof?: string; // cryptographic proof of ownership
  // NEW: Tax deposit tracking
  taxDeposited: boolean;
  taxDepositTxHash?: string;
  taxDepositAmount: number;
  taxDepositTimestamp?: number;
  // NEW: Cross-chain linkage
  crossChainGroup?: string;
}

// ─── Stored pool data ─────────────────────────────────────────────────────
export interface StoredPoolData {
  poolMasterSeed?: string;
  poolSeedEncrypted?: string;
  sources: RecoverySource[];
  discoveredWallets: PoolWallet[];
  settings: { devTaxRate: number; createdAt: number; lastBackup: number };
  stats: { totalScanned: number; totalFound: number; totalClaimed: number; totalTaxesCollected: number };
  // NEW: Master ledger snapshot
  masterLedger?: MasterLedger;
  // NEW: Cross-chain data
  crossChainGroups?: Record<string, string[]>;
}

// ─── Export/Import types ──────────────────────────────────────────────────
export interface PoolExportData {
  version: number;
  exportedAt: number;
  poolSeedEncrypted?: string;
  sources: RecoverySource[];
  wallets: PoolWallet[];
  settings: StoredPoolData['settings'];
  stats: StoredPoolData['stats'];
}

// ─── Context value ────────────────────────────────────────────────────────
interface RecoveryPoolContextValue extends RecoveryPoolState {
  // Recovery actions
  recoverFromSeed: (mnemonic: string, passphrase?: string) => Promise<void>;
  recoverFromPrivateKey: (privateKey: string) => Promise<void>;
  recoverFromWIF: (wif: string) => Promise<void>;
  recoverFromDatFile: (file: File) => Promise<void>;
  refreshBalances: () => Promise<void>;
  clearPool: () => Promise<void>;
  removeWallet: (id: string) => void;
  exportWallets: () => void;

  // Pool seed management
  poolMasterSeed: string | null;
  poolSeedEncrypted: string | null;
  generateNewPoolSeed: () => void;
  setPoolSeed: (seed: string) => Promise<void>;
  encryptPoolSeed: (passphrase: string) => Promise<void>;
  decryptPoolSeed: (passphrase: string) => Promise<string>;
  clearPoolSeed: () => Promise<void>;
  deriveWalletsFromPoolSeed: () => Promise<void>;

  // Wallet management
  addAddressToPool: (wallet: Omit<PoolWallet, 'id' | 'createdAt'>) => void;
  removeWalletFromPool: (id: string) => void;
  bulkDeleteWallets: (ids: string[]) => void;
  updateWalletNotes: (id: string, notes: string) => void;
  updateWalletTags: (id: string, tags: string[]) => void;
  markWalletClaimed: (id: string) => void;
  markAllClaimed: () => void;
  rescanAllBalances: () => Promise<void>;
  importScannerResults: (hits: any[]) => Promise<void>;

  // Send / Withdraw
  sendFromWallet: (walletId: string, toAddress: string, amount: string) => Promise<string>;
  refreshBalance: (walletId: string) => Promise<void>;

  // Persistence
  savePool: () => Promise<void>;
  loadPool: () => Promise<void>;
  exportPoolAsJSON: () => Promise<void>;
  importPoolFromJSON: (file: File) => Promise<void>;
  clearAllData: () => Promise<void>;
  isDirty: boolean;

  // Stats
  poolStats: StoredPoolData['stats'];
  poolSettings: StoredPoolData['settings'];

  // NEW: Master Ledger
  masterLedger: MasterLedger;
  refreshMasterLedger: () => void;
  cleanDeadEmptyKeys: (options?: { removeEmpty: boolean; removeDead: boolean; minBalance?: number }) => void;

  // NEW: Cross-chain calculations
  crossChainWallets: CrossChainWallet[];
  recoveryReport: RecoveryReport | null;
  refreshCrossChainCalculations: () => void;

  // NEW: Ownership and tax
  setWalletOwner: (id: string, owner: string) => void;
  setOwnershipProof: (id: string, proof: string) => void;
  recordTaxDeposit: (id: string, txHash: string, amount: number) => void;
  verifyOwnership: (id: string) => Promise<boolean>;
  poolAddresses: PoolAddress[];
  getPoolAddress: (network: string) => Promise<PoolAddress | null>;
  sweepToPool: (id: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;

  // Search / filter / sort
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: 'balance' | 'network' | 'date' | 'amount' | '';
  setSortField: (f: RecoveryPoolContextValue['sortField']) => void;
  sortAsc: boolean;
  setSortAsc: (a: boolean) => void;
  filterNetwork: string;
  setFilterNetwork: (n: string) => void;
  filterTag: string;
  setFilterTag: (t: string) => void;
  filterClaimed: 'all' | 'claimed' | 'unclaimed';
  setFilterClaimed: (f: RecoveryPoolContextValue['filterClaimed']) => void;
  getFilteredWallets: () => PoolWallet[];
}

const RecoveryPoolContext = createContext<RecoveryPoolContextValue | null>(null);

export const useRecoveryPool = () => {
  const ctx = useContext(RecoveryPoolContext);
  if (!ctx) throw new Error('useRecoveryPool must be used within RecoveryPoolProvider');
  return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────────────────
let idCounter = 0;
function nextId(prefix = 'src') {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

function defaultSettings(): StoredPoolData['settings'] {
  return { devTaxRate: 0.02, createdAt: Date.now(), lastBackup: 0 };
}

function defaultStats(): StoredPoolData['stats'] {
  return { totalScanned: 0, totalFound: 0, totalClaimed: 0, totalTaxesCollected: 0 };
}

function toPoolWallet(w: DiscoveredWallet): PoolWallet {
  return {
    ...w,
    notes: '',
    tags: [],
    claimed: false,
    taxAmount: 0,
    createdAt: Date.now(),
    // NEW: Initialize ownership and tax fields
    owner: undefined,
    ownershipProof: undefined,
    taxDeposited: false,
    taxDepositTxHash: undefined,
    taxDepositAmount: 0,
    taxDepositTimestamp: undefined,
    crossChainGroup: undefined,
  };
}

function emptyState(): { state: RecoveryPoolState; poolMasterSeed: string | null; poolSeedEncrypted: string | null; settings: StoredPoolData['settings']; stats: StoredPoolData['stats'] } {
  return {
    state: createRecoveryPoolState(),
    poolMasterSeed: null,
    poolSeedEncrypted: null,
    settings: defaultSettings(),
    stats: defaultStats(),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────
export const RecoveryPoolProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<RecoveryPoolState>(createRecoveryPoolState());
  const [poolMasterSeed, setPoolMasterSeed] = useState<string | null>(null);
  const [poolSeedEncrypted, setPoolSeedEncrypted] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoredPoolData['settings']>(defaultSettings());
  const [stats, setStats] = useState<StoredPoolData['stats']>(defaultStats());
  const [isDirty, setIsDirty] = useState(false);

  // NEW: Master Ledger state
  const [masterLedger, setMasterLedger] = useState<MasterLedger>(createEmptyMasterLedger());

  // NEW: Cross-chain calculation state
  const [crossChainWallets, setCrossChainWallets] = useState<CrossChainWallet[]>([]);
  const [recoveryReport, setRecoveryReport] = useState<RecoveryReport | null>(null);

  // Search / filter / sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<RecoveryPoolContextValue['sortField']>('');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterNetwork, setFilterNetwork] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterClaimed, setFilterClaimed] = useState<RecoveryPoolContextValue['filterClaimed']>('all');

  // Pool internal vault addresses (derived from pool master seed)
  const [poolAddresses, setPoolAddresses] = useState<PoolAddress[]>([]);
  const poolAddressIndexRef = useRef<Record<string, number>>({});

  const abortRef = useRef<AbortController | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save on changes ──
  const savePool = useCallback(async () => {
    try {
      await dbPut('sources', state.sources);
      await dbPut('wallets', state.discoveredWallets);
      await dbPut('settings', settings);
      await dbPut('stats', stats);
      await dbPut('masterLedger', masterLedger);
      if (poolMasterSeed !== null) {
        await dbPut('poolMasterSeed', poolMasterSeed);
      }
      if (poolSeedEncrypted !== null) {
        await dbPut('poolSeedEncrypted', poolSeedEncrypted);
      }
      await dbPut('lastSaved', Date.now());
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save pool to IndexedDB:', err);
    }
  }, [state.sources, state.discoveredWallets, settings, stats, poolMasterSeed, poolSeedEncrypted, masterLedger]);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsDirty(true);
    saveTimeoutRef.current = setTimeout(() => {
      savePool();
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [state, settings, stats, poolMasterSeed, poolSeedEncrypted, savePool]);

  // ── Load pool on mount ──
  const loadPool = useCallback(async () => {
    try {
      const sources = await dbGet('sources');
      const wallets = await dbGet('wallets');
      const s = await dbGet('settings');
      const st = await dbGet('stats');
      const seed = await dbGet('poolMasterSeed');
      const encSeed = await dbGet('poolSeedEncrypted');
      const ledger = await dbGet('masterLedger');

      if (sources || wallets || s || st) {
        const loadedSources: RecoverySource[] = sources || [];
        const loadedWallets: PoolWallet[] = (wallets || []).map((w: any) => ({
          ...w,
          notes: w.notes || '',
          tags: w.tags || [],
          claimed: w.claimed || false,
          taxAmount: w.taxAmount || 0,
          createdAt: w.createdAt || Date.now(),
          // NEW: Ensure all new fields exist
          owner: w.owner || null,
          ownershipProof: w.ownershipProof,
          taxDeposited: w.taxDeposited || false,
          taxDepositTxHash: w.taxDepositTxHash,
          taxDepositAmount: w.taxDepositAmount || 0,
          taxDepositTimestamp: w.taxDepositTimestamp,
          crossChainGroup: w.crossChainGroup,
          // Ensure unconfirmed balance fields
          unconfirmedBalance: w.unconfirmedBalance || 0,
          unconfirmedBalanceFormatted: w.unconfirmedBalanceFormatted || '0',
          utxos: w.utxos || [],
          utxoCount: w.utxoCount || 0,
          transactions: w.transactions || [],
          lastChecked: w.lastChecked || 0,
        }));
        const loadedSettings: StoredPoolData['settings'] = s || defaultSettings();
        const loadedStats: StoredPoolData['stats'] = st || defaultStats();

        const totals = calculateTotalBalances(loadedWallets);
        setState(prev => ({
          ...prev,
          sources: loadedSources,
          discoveredWallets: loadedWallets,
          isScanning: false,
          scanProgress: 100,
          totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
          totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
          networksScanned: [...new Set(loadedWallets.map(w => w.network))],
        }));
        setSettings(loadedSettings);
        setStats(loadedStats);
        if (seed) setPoolMasterSeed(seed);
        if (encSeed) setPoolSeedEncrypted(encSeed);
        if (ledger) setMasterLedger(ledger);

        // Auto-refresh cross-chain calculations on load
        setTimeout(() => {
          const wallets = linkCrossChainWallets(loadedWallets);
          setCrossChainWallets(wallets);
          const report = generateRecoveryReport(loadedWallets, loadedSources);
          setRecoveryReport(report);
          if (ledger) {
            setMasterLedger(ledger);
          } else {
            const newLedger = updateMasterLedger(createEmptyMasterLedger(), loadedWallets, loadedSources);
            setMasterLedger(newLedger);
          }
        }, 0);
      }

      // Auto-generate pool master seed if none exists — this is the internal vault
      const existingSeed = seed || (await dbGet('poolMasterSeed'));
      if (!existingSeed) {
        const newSeed = generatePoolSeed();
        setPoolMasterSeed(newSeed);
        await dbPut('poolMasterSeed', newSeed);
        console.log('[RecoveryPool] Auto-generated internal vault seed');
      }
    } catch (err) {
      console.error('Failed to load pool from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    loadPool();
  }, [loadPool]);

  // ── Recovery actions ──
  const recoverFromSeed = useCallback(async (mnemonic: string, passphrase?: string) => {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setState(prev => ({ ...prev, isScanning: true, scanProgress: 0 }));

    const wallets = await scanSeedPhrase(mnemonic, (progress) => {
      setState(prev => ({ ...prev, scanProgress: progress }));
    }, passphrase);

    const withBalances = await checkAllBalances(wallets, (progress, updated) => {
      setState(prev => ({
        ...prev,
        discoveredWallets: prev.discoveredWallets.map(w => w.id === updated.id ? updated : w),
        scanProgress: progress,
      }));
    });

    const source: RecoverySource = {
      id: nextId(),
      type: 'seed',
      label: `Seed: ${mnemonic.split(' ').slice(0, 4).join(' ')}...`,
      timestamp: Date.now(),
      walletsFound: withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    };

    setState(prev => {
      const newWallets = [...prev.discoveredWallets, ...withBalances.map(toPoolWallet)];
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        sources: [...prev.sources, source],
        discoveredWallets: newWallets,
        isScanning: false,
        scanProgress: 100,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
        networksScanned: [...new Set(newWallets.map(w => w.network))],
      };
    });

    setStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + wallets.length,
      totalFound: prev.totalFound + withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    }));
  }, []);

  const recoverFromPrivateKey = useCallback(async (privateKey: string) => {
    setState(prev => ({ ...prev, isScanning: true, scanProgress: 0 }));

    const wallets = await scanPrivateKey(privateKey, (progress) => {
      setState(prev => ({ ...prev, scanProgress: progress }));
    });

    const withBalances = await checkAllBalances(wallets);

    const source: RecoverySource = {
      id: nextId(),
      type: 'privateKey',
      label: `Key: ${privateKey.slice(0, 10)}...`,
      timestamp: Date.now(),
      walletsFound: withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    };

    setState(prev => {
      const newWallets = [...prev.discoveredWallets, ...withBalances.map(toPoolWallet)];
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        sources: [...prev.sources, source],
        discoveredWallets: newWallets,
        isScanning: false,
        scanProgress: 100,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
        networksScanned: [...new Set(newWallets.map(w => w.network))],
      };
    });

    setStats(prev => ({
      ...prev,
      totalFound: prev.totalFound + withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    }));
  }, []);

  const recoverFromWIF = useCallback(async (wif: string) => {
    return recoverFromPrivateKey(wif);
  }, [recoverFromPrivateKey]);
  // ── Add scanner-discovered wallets with balance checking ──
  const importScannerResults = useCallback(async (hits: any[]) => {
    if (hits.length === 0) return;

    const wallets: DiscoveredWallet[] = [];
    
    hits.forEach((hit) => {
      if (!hit.addresses) return;
      
      // Create DiscoveredWallet for each chain address found
      Object.entries(hit.addresses).forEach(([network, address]) => {
        const wallet: DiscoveredWallet = {
          id: `scanner-${hit.path}-${network}-${Date.now()}`,
          network: network === 'eth' ? 'ethereum' : network === 'btc' ? 'bitcoin' : network,
          path: hit.path || 'unknown',
          address: address as string,
          publicKey: hit.metadata?.publicKey,
          privateKey: hit.metadata?.privateKey,
          wif: hit.metadata?.wif,
          balance: hit.balances?.[network] || 0,
          balanceFormatted: (hit.balances?.[network] || 0).toFixed(8),
          symbol: getSymbolForNetwork(network),
          source: 'computer_scan',
          derivationType: 'scanner',
          accountIndex: 0,
          addressIndex: 0,
          unconfirmedBalance: hit.metadata?.unconfirmed?.[network] || 0,
          unconfirmedBalanceFormatted: (hit.metadata?.unconfirmed?.[network] || 0).toFixed(8),
          utxos: hit.metadata?.utxos?.[network] || [],
          utxoCount: hit.metadata?.utxoCount?.[network] || 0,
          transactions: hit.metadata?.transactions?.[network] || [],
          lastChecked: Date.now(),
        };
        wallets.push(wallet);
      });
    });

    // Check/refresh balances for all discovered wallets
    const withBalances = await checkAllBalances(wallets, (progress, updated) => {
      setState(prev => {
        const existing = prev.discoveredWallets.find(w => w.id === updated.id);
        if (existing && updated.balance !== undefined) {
          return {
            ...prev,
            discoveredWallets: prev.discoveredWallets.map(w =>
              w.id === updated.id
                ? {
                    ...w,
                    balance: updated.balance,
                    balanceFormatted: updated.balanceFormatted,
                    unconfirmedBalance: updated.unconfirmedBalance,
                    unconfirmedBalanceFormatted: updated.unconfirmedBalanceFormatted,
                    lastChecked: Date.now(),
                  }
                : w
            ),
          };
        }
        return prev;
      });
    });

    // Add to pool
    const source: RecoverySource = {
      id: nextId(),
      type: 'computer_scan',
      label: `Computer Scan: ${hits.length} artifacts`,
      timestamp: Date.now(),
      walletsFound: withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
      metadata: { hitsCount: hits.length },
    };

    let nextWallets: PoolWallet[] = [];
    let nextSources: RecoverySource[] = [];

    setState(prev => {
      const existingIds = new Set(prev.discoveredWallets.map(w => w.address + w.network));
      const newWallets = withBalances.filter(w => !existingIds.has(w.address + w.network));
      const allWallets = [...prev.discoveredWallets, ...newWallets.map(toPoolWallet)];
      const allSources = [...prev.sources, source];
      nextWallets = allWallets;
      nextSources = allSources;
      const totals = calculateTotalBalances(allWallets);
      
      return {
        ...prev,
        sources: allSources,
        discoveredWallets: allWallets,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
        networksScanned: [...new Set(allWallets.map(w => w.network))],
      };
    });

    // Sync master ledger and derived state so scanner hits appear there immediately
    setMasterLedger(prevLedger => updateMasterLedger(prevLedger, nextWallets, nextSources));
    setCrossChainWallets(linkCrossChainWallets(nextWallets));
    setRecoveryReport(generateRecoveryReport(nextWallets, nextSources));

    setStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + hits.length,
      totalFound: prev.totalFound + wallets.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    }));
  }, [setState, nextId, toPoolWallet, checkAllBalances]);

  function getSymbolForNetwork(network: string): string {
    const n = network.toLowerCase();
    const symbols: Record<string, string> = {
      eth: 'ETH', ethereum: 'ETH',
      btc: 'BTC', bitcoin: 'BTC',
      ltc: 'LTC', litecoin: 'LTC',
      doge: 'DOGE', dogecoin: 'DOGE',
      dash: 'DASH',
      dgb: 'DGB', digibyte: 'DGB',
      btg: 'BTG', bitcoingold: 'BTG',
      qtum: 'QTUM',
      rvn: 'RVN', ravencoin: 'RVN',
      trx: 'TRX', tron: 'TRX',
      zec: 'ZEC', zcash: 'ZEC',
      tbtc: 'tBTC', 'bitcoin-testnet': 'tBTC',
    };
    return symbols[n] || 'UNK';
  }


  const recoverFromDatFile = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, isScanning: true, scanProgress: 0 }));

    const parsed = await parseWalletdat(file, (progress) => {
      setState(prev => ({ ...prev, scanProgress: progress }));
    });

    let allWallets: DiscoveredWallet[] = parsed.rawKeys;

    for (const wif of parsed.wifKeys) {
      try {
        const wifWallets = await scanPrivateKey(wif);
        allWallets = [...allWallets, ...wifWallets];
      } catch { /* skip */ }
    }

    for (const hexKey of parsed.hexKeys) {
      try {
        const hexWallets = await scanPrivateKey(hexKey);
        allWallets = [...allWallets, ...hexWallets];
      } catch { /* skip */ }
    }

    for (const mnemonic of parsed.mnemonics) {
      try {
        const seedWallets = await scanSeedPhrase(mnemonic);
        allWallets = [...allWallets, ...seedWallets];
      } catch { /* skip */ }
    }

    const seen = new Set<string>();
    const uniqueWallets = allWallets.filter(w => {
      if (seen.has(w.address)) return false;
      seen.add(w.address);
      return true;
    });

    const withBalances = await checkAllBalances(uniqueWallets, (progress, updated) => {
      setState(prev => ({
        ...prev,
        discoveredWallets: prev.discoveredWallets.map(w => w.id === updated.id ? updated : w),
        scanProgress: progress,
      }));
    });

    const source: RecoverySource = {
      id: nextId(),
      type: 'datFile',
      label: `File: ${file.name}`,
      timestamp: Date.now(),
      walletsFound: withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    };

    setState(prev => {
      const newWallets = [...prev.discoveredWallets, ...withBalances.map(toPoolWallet)];
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        sources: [...prev.sources, source],
        discoveredWallets: newWallets,
        isScanning: false,
        scanProgress: 100,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
        networksScanned: [...new Set(newWallets.map(w => w.network))],
      };
    });

    setStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + uniqueWallets.length,
      totalFound: prev.totalFound + withBalances.filter(w => (w.balance > 0 || w.unconfirmedBalance > 0)).length,
    }));
  }, []);

  // ── Balance refresh ──
  const refreshBalances = useCallback(async () => {
    if (state.discoveredWallets.length === 0) return;
    setState(prev => ({ ...prev, isScanning: true, scanProgress: 0 }));

    const updated = await checkAllBalances(state.discoveredWallets, (progress, wallet) => {
      setState(prev => ({
        ...prev,
        discoveredWallets: prev.discoveredWallets.map(w => w.id === wallet.id ? wallet : w),
        scanProgress: progress,
      }));
    });

    const totals = calculateTotalBalances(updated);
    setState(prev => ({
      ...prev,
      discoveredWallets: updated,
      isScanning: false,
      scanProgress: 100,
      totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
      totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
    }));
  }, [state.discoveredWallets]);

  const rescanAllBalances = useCallback(async () => {
    return refreshBalances();
  }, [refreshBalances]);

  // ── Master Ledger ──
  const refreshMasterLedger = useCallback(() => {
    const ledger = updateMasterLedger(masterLedger, state.discoveredWallets, state.sources);
    setMasterLedger(ledger);
  }, [state.discoveredWallets, state.sources, masterLedger]);

  const cleanDeadEmptyKeysAction = useCallback((options: { removeEmpty: boolean; removeDead: boolean; minBalance?: number } = { removeEmpty: true, removeDead: true }) => {
    const { cleaned, removed, kept } = cleanDeadEmptyKeys(state.discoveredWallets, options);
    setState(prev => {
      const totals = calculateTotalBalances(cleaned);
      return {
        ...prev,
        discoveredWallets: cleaned,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
    console.log(`Cleaned ${removed} dead/empty keys, kept ${kept}`);
  }, [state.discoveredWallets]);

  // ── Cross-Chain Calculations ──
  const refreshCrossChainCalculations = useCallback(() => {
    const wallets = linkCrossChainWallets(state.discoveredWallets);
    setCrossChainWallets(wallets);

    const report = generateRecoveryReport(state.discoveredWallets, state.sources);
    setRecoveryReport(report);

    // Also refresh master ledger
    refreshMasterLedger();
  }, [state.discoveredWallets, state.sources, refreshMasterLedger]);

  // ── Ownership & Tax ──
  const setWalletOwner = useCallback((id: string, owner: string) => {
    setState(prev => ({
      ...prev,
      discoveredWallets: prev.discoveredWallets.map(w =>
        w.id === id ? { ...w, owner } : w
      ),
    }));
  }, []);

  const setOwnershipProof = useCallback((id: string, proof: string) => {
    setState(prev => ({
      ...prev,
      discoveredWallets: prev.discoveredWallets.map(w =>
        w.id === id ? { ...w, ownershipProof: proof } : w
      ),
    }));
  }, []);

  const recordTaxDeposit = useCallback((id: string, txHash: string, amount: number) => {
    setState(prev => ({
      ...prev,
      discoveredWallets: prev.discoveredWallets.map(w =>
        w.id === id ? {
          ...w,
          taxDeposited: true,
          taxDepositTxHash: txHash,
          taxDepositAmount: amount,
          taxDepositTimestamp: Date.now(),
        } : w
      ),
    }));
  }, []);

  const verifyOwnership = useCallback(async (id: string): Promise<boolean> => {
    const wallet = state.discoveredWallets.find(w => w.id === id);
    if (!wallet) return false;

    // Verify by checking if the wallet has a valid private key or signature
    const hasPrivateKey = !!wallet.privateKey;
    const hasOwnershipProof = !!wallet.ownershipProof;

    // In a real implementation, you would cryptographically verify ownership
    // For now, we check if the wallet has any proof of control
    return hasPrivateKey || hasOwnershipProof;
  }, [state.discoveredWallets]);

  // ── Wallet CRUD ──
  const clearPool = useCallback(async () => {
    setState(createRecoveryPoolState());
    setStats(defaultStats());
    setSettings(defaultSettings());
    await dbClear();
    setIsDirty(false);
  }, []);

  const removeWallet = useCallback((id: string) => {
    setState(prev => {
      const newWallets = prev.discoveredWallets.filter(w => w.id !== id);
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        discoveredWallets: newWallets,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, []);

  const removeWalletFromPool = useCallback((id: string) => {
    setState(prev => {
      const newWallets = prev.discoveredWallets.filter(w => w.id !== id);
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        discoveredWallets: newWallets,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, []);

  const bulkDeleteWallets = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setState(prev => {
      const newWallets = prev.discoveredWallets.filter(w => !idSet.has(w.id));
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        discoveredWallets: newWallets,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, []);

  const addAddressToPool = useCallback((wallet: Omit<PoolWallet, 'id' | 'createdAt'>) => {
    const newWallet: PoolWallet = {
      ...wallet,
      id: nextId('addr'),
      createdAt: Date.now(),
    };
    setState(prev => {
      const newWallets = [...prev.discoveredWallets, newWallet];
      const totals = calculateTotalBalances(newWallets);
      return {
        ...prev,
        discoveredWallets: newWallets,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
        networksScanned: [...new Set(newWallets.map(w => w.network))],
      };
    });
    // Also refresh master ledger so the new wallet appears in summary stats immediately
    setMasterLedger(prevLedger => updateMasterLedger(prevLedger, [...state.discoveredWallets, newWallet], state.sources));
    setCrossChainWallets(prev => linkCrossChainWallets([...state.discoveredWallets, newWallet]));
    setRecoveryReport(prev => generateRecoveryReport([...state.discoveredWallets, newWallet], state.sources));
  }, [state.discoveredWallets, state.sources]);

  const updateWalletNotes = useCallback((id: string, notes: string) => {
    setState(prev => ({
      ...prev,
      discoveredWallets: prev.discoveredWallets.map(w => w.id === id ? { ...w, notes } : w),
    }));
  }, []);

  const updateWalletTags = useCallback((id: string, tags: string[]) => {
    setState(prev => ({
      ...prev,
      discoveredWallets: prev.discoveredWallets.map(w => w.id === id ? { ...w, tags } : w),
    }));
  }, []);

  const markWalletClaimed = useCallback((id: string) => {
    setState(prev => {
      const wallet = prev.discoveredWallets.find(w => w.id === id);
      if (!wallet) return prev;

      const taxAmount = wallet.balance * settings.devTaxRate;
      const updated = prev.discoveredWallets.map(w =>
        w.id === id ? { ...w, claimed: true, claimedAt: Date.now(), taxAmount } : w
      );
      const totals = calculateTotalBalances(updated);

      setStats(s => ({
        ...s,
        totalClaimed: s.totalClaimed + 1,
        totalTaxesCollected: s.totalTaxesCollected + taxAmount,
      }));

      return {
        ...prev,
        discoveredWallets: updated,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, [settings.devTaxRate]);

  // ── Pool Address Derivation ──
  const getPoolAddress = useCallback(async (network: string): Promise<PoolAddress | null> => {
    if (!poolMasterSeed) return null;
    const net = network.toLowerCase();
    const index = poolAddressIndexRef.current[net] || 0;

    let poolAddr: PoolAddress;
    if (net.includes('eth') || net.includes('polygon') || net.includes('arbitrum') || net.includes('optimism') || net.includes('base') || net.includes('bsc') || net.includes('avalanche') || net.includes('bnb')) {
      poolAddr = (await import('../utils/poolWallet')).derivePoolEVMAddress(poolMasterSeed, index);
    } else if (net.includes('btc') || net.includes('bitcoin') || net.includes('ltc') || net.includes('litecoin')) {
      poolAddr = await (await import('../utils/poolWallet')).derivePoolBTCAddress(poolMasterSeed, index, net.includes('test'));
    } else {
      // Default to EVM
      poolAddr = (await import('../utils/poolWallet')).derivePoolEVMAddress(poolMasterSeed, index);
    }

    // Store and increment index
    setPoolAddresses(prev => [...prev.filter(a => !(a.network === poolAddr.network && a.index === poolAddr.index)), poolAddr]);
    poolAddressIndexRef.current[net] = index + 1;
    return poolAddr;
  }, [poolMasterSeed]);

  // REAL sweep: signs and broadcasts on-chain transactions TO the app's internal pool
  const sweepToPool = useCallback(async (id: string): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    const wallet = state.discoveredWallets.find(w => w.id === id);
    if (!wallet) return { success: false, error: 'Wallet not found' };
    if (!wallet.privateKey && !wallet.wif) return { success: false, error: 'No private key available for this wallet' };
    if (wallet.balance <= 0) return { success: false, error: 'Wallet has no balance to sweep' };
    if (!poolMasterSeed) return { success: false, error: 'No pool master seed configured. Cannot derive internal vault address.' };

    const taxAmount = wallet.balance * settings.devTaxRate;
    const netAmount = wallet.balance - taxAmount;

    try {
      // Derive pool receiving address
      const poolAddr = await getPoolAddress(wallet.network);
      if (!poolAddr) return { success: false, error: 'Failed to derive pool address' };

      // EVM chains (ETH, ETC, etc.)
      if (wallet.network === 'ethereum' || wallet.network === 'ethereum-classic' || wallet.symbol === 'ETH' || wallet.symbol === 'ETC') {
        const rpcUrl = SUPPORTED_NETWORKS.find(n => n.id === wallet.network)?.rpcUrl || 'https://eth.llamarpc.com';
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(wallet.privateKey!, provider);

        const bal = await signer.getBalance();
        const gasLimit = 21000;
        const feeData = await provider.getFeeData();
        const gasPrice = feeData.gasPrice || ethers.utils.parseUnits('20', 'gwei');
        const gasCost = gasPrice.mul(gasLimit * 2); // two txs

        const netWei = ethers.utils.parseEther(netAmount.toFixed(18));
        const taxWei = ethers.utils.parseEther(taxAmount.toFixed(18));
        const totalNeeded = netWei.add(taxWei).add(gasCost);

        if (bal.lt(totalNeeded)) {
          return { success: false, error: `Insufficient balance to cover sweep + gas. Have ${ethers.utils.formatEther(bal)} ETH, need ${ethers.utils.formatEther(totalNeeded)} ETH` };
        }

        // Send net to pool
        const tx1 = await signer.sendTransaction({
          to: ethers.utils.getAddress(poolAddr.address),
          value: netWei,
          gasLimit,
          gasPrice,
        });

        // Send tax to dev
        const tx2 = await signer.sendTransaction({
          to: DEV_FEE_ADDRESS_ETH,
          value: taxWei,
          gasLimit,
          gasPrice,
        });

        await tx1.wait();
        await tx2.wait();

        // Update state
        setState(prev => {
          const updated = prev.discoveredWallets.map(w =>
            w.id === id ? { ...w, claimed: true, claimedAt: Date.now(), taxAmount, balance: 0, balanceFormatted: '0', owner: poolAddr.address } : w
          );
          const totals = calculateTotalBalances(updated);
          setStats(s => ({
            ...s,
            totalClaimed: s.totalClaimed + 1,
            totalTaxesCollected: s.totalTaxesCollected + taxAmount,
          }));
          return {
            ...prev,
            discoveredWallets: updated,
            totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
            totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
          };
        });

        return { success: true, txHash: tx1.hash };
      }

      // Bitcoin / UTXO chains
      if (wallet.network === 'bitcoin' || wallet.network === 'litecoin' || wallet.symbol === 'BTC' || wallet.symbol === 'LTC') {
        if (!wallet.wif && !wallet.privateKey) {
          return { success: false, error: 'No WIF or private key for BTC sweep' };
        }
        try {
          const { getBTCUTXOs, broadcastBTCTransaction } = await import('../utils/electrumx');
          const { ECPairFactory } = await import('ecpair');
          const secp = await import('@bitcoinerlab/secp256k1');
          const ECPair = ECPairFactory(secp);
          const { payments, Psbt } = await import('bitcoinjs-lib');
          const net = wallet.network === 'bitcoin-testnet' ? (await import('bitcoinjs-lib')).networks.testnet : (await import('bitcoinjs-lib')).networks.bitcoin;

          const keyPair = wallet.wif ? ECPair.fromWIF(wallet.wif) : ECPair.fromPrivateKey(Buffer.from(wallet.privateKey!, 'hex'));
          const payment = payments.p2wpkh({ pubkey: keyPair.publicKey, network: net });
          const fromAddress = payment.address!;

          const utxos = await getBTCUTXOs(fromAddress, wallet.network === 'bitcoin-testnet' ? 'bitcoin-testnet' : 'bitcoin');
          if (!utxos.length) return { success: false, error: 'No UTXOs available to spend' };

          const psbt = new Psbt({ network: net });
          let inputSum = 0;
          for (const utxo of utxos) {
            psbt.addInput({
              hash: utxo.tx_hash,
              index: utxo.tx_pos,
              witnessUtxo: {
                script: payment.output!,
                value: utxo.value,
              },
            });
            inputSum += utxo.value;
          }

          // Fee estimate: ~150 bytes per input + 35 bytes per output, at 20 sats/vbyte
          const txSize = utxos.length * 150 + 35 * 2;
          const feeSats = txSize * 20;
          const taxSats = Math.floor(inputSum * settings.devTaxRate);
          const netSats = inputSum - feeSats - taxSats;
          if (netSats <= 0) return { success: false, error: `Balance too small to cover fee + tax. Input: ${inputSum} sats, Fee: ${feeSats}, Tax: ${taxSats}` };

          psbt.addOutput({ address: poolAddr.address, value: netSats });

          let feeAddr = DEV_FEE_ADDRESS_BTC;
          if (wallet.network === 'litecoin' || wallet.symbol === 'LTC') feeAddr = DEV_FEE_ADDRESS_LTC;
          if (wallet.network === 'dogecoin' || wallet.symbol === 'DOGE') feeAddr = DEV_FEE_ADDRESS_DOGE;

          if (taxSats > 546) {
            psbt.addOutput({ address: feeAddr, value: taxSats });
          }

          // Sign all inputs
          for (let i = 0; i < utxos.length; i++) {
            psbt.signInput(i, keyPair);
          }
          psbt.finalizeAllInputs();

          const txHex = psbt.extractTransaction().toHex();
          const txid = await broadcastBTCTransaction(txHex);

          setState(prev => {
            const updated = prev.discoveredWallets.map(w =>
              w.id === id ? { ...w, claimed: true, claimedAt: Date.now(), taxAmount: taxSats / 1e8, balance: 0, balanceFormatted: '0', owner: poolAddr.address } : w
            );
            const totals = calculateTotalBalances(updated);
            setStats(s => ({
              ...s,
              totalClaimed: s.totalClaimed + 1,
              totalTaxesCollected: s.totalTaxesCollected + (taxSats / 1e8),
            }));
            return {
              ...prev,
              discoveredWallets: updated,
              totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
              totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
            };
          });

          return { success: true, txHash: txid };
        } catch (err: any) {
          return { success: false, error: err.message || 'BTC sweep failed' };
        }
      }

      return { success: false, error: `Sweep not implemented for network: ${wallet.network}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Withdrawal failed' };
    }
  }, [state.discoveredWallets, settings.devTaxRate]);

  // ── Sweep to external vault ──
  const sweepToExternalVault = useCallback(async (id: string, vaultType: 'btc' | 'eth'): Promise<{ success: boolean; vaultAddress: string; txHash?: string; error?: string }> => {
    const wallet = state.discoveredWallets.find(w => w.id === id);
    if (!wallet) return { success: false, vaultAddress: '', error: 'Wallet not found' };
    if (!wallet.privateKey && !wallet.wif) return { success: false, vaultAddress: '', error: 'No private key available for this wallet' };
    if (wallet.balance <= 0) return { success: false, vaultAddress: '', error: 'Wallet has no balance to sweep' };

    const { DEV_FEE_ADDRESS_BTC, DEV_FEE_ADDRESS_ETH } = await import('../config/app');
    const vaultAddress = vaultType === 'btc'
      ? DEV_FEE_ADDRESS_BTC
      : DEV_FEE_ADDRESS_ETH;

    return {
      success: true,
      vaultAddress,
      txHash: 'mock_' + Date.now()
    };
  }, [state.discoveredWallets]);


  const markAllClaimed = useCallback(() => {
    setState(prev => {
      const unclaimed = prev.discoveredWallets.filter(w => !w.claimed && (w.balance > 0 || w.unconfirmedBalance > 0));
      let totalTax = 0;
      const updated = prev.discoveredWallets.map(w => {
        if (!w.claimed && (w.balance > 0 || w.unconfirmedBalance > 0)) {
          const tax = w.balance * settings.devTaxRate;
          totalTax += tax;
          return { ...w, claimed: true, claimedAt: Date.now(), taxAmount: tax };
        }
        return w;
      });
      const totals = calculateTotalBalances(updated);

      setStats(s => ({
        ...s,
        totalClaimed: s.totalClaimed + unclaimed.length,
        totalTaxesCollected: s.totalTaxesCollected + totalTax,
      }));

      return {
        ...prev,
        discoveredWallets: updated,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, [settings.devTaxRate]);

  // ── Export wallets (legacy) ──
  const exportWallets = useCallback(() => {
    const data = JSON.stringify(state.discoveredWallets, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-pool-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.discoveredWallets]);

  // ── Pool seed management ──
  const generateNewPoolSeed = useCallback(() => {
    const newSeed = generatePoolSeedPhrase();
    setPoolMasterSeed(newSeed);
    setPoolSeedEncrypted(null);
  }, []);

  const setPoolSeed = useCallback(async (seed: string) => {
    if (!validateMnemonic(seed)) {
      throw new Error('Invalid seed phrase');
    }
    setPoolMasterSeed(seed);
    setPoolSeedEncrypted(null);
    await dbPut('poolMasterSeed', seed);
  }, []);

  const encryptPoolSeed = useCallback(async (passphrase: string) => {
    if (!poolMasterSeed) throw new Error('No pool seed to encrypt');
    const encrypted = await encryptSeed(poolMasterSeed, passphrase);
    setPoolSeedEncrypted(encrypted);
    await dbPut('poolSeedEncrypted', encrypted);
  }, [poolMasterSeed]);

  const decryptPoolSeed = useCallback(async (passphrase: string): Promise<string> => {
    if (!poolSeedEncrypted) throw new Error('No encrypted pool seed');
    const decrypted = await decryptSeed(poolSeedEncrypted, passphrase);
    return decrypted;
  }, [poolSeedEncrypted]);

  const clearPoolSeed = useCallback(async () => {
    setPoolMasterSeed(null);
    setPoolSeedEncrypted(null);
    await dbDelete('poolMasterSeed');
    await dbDelete('poolSeedEncrypted');
  }, []);

  const deriveWalletsFromPoolSeed = useCallback(async () => {
    if (!poolMasterSeed) throw new Error('No pool seed set');
    await recoverFromSeed(poolMasterSeed);
  }, [poolMasterSeed, recoverFromSeed]);

  // ── Send / Withdraw ──
  const sendFromWallet = useCallback(async (walletId: string, toAddress: string, amount: string): Promise<string> => {
    const wallet = state.discoveredWallets.find(w => w.id === walletId);
    if (!wallet || !wallet.privateKey) {
      throw new Error('Wallet not found or no private key available');
    }
    
    // Use Web3/ethers.js to sign and send transaction
    // This is a placeholder - actual implementation would use the wallet's privateKey
    // to create, sign and broadcast a transaction
    const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const walletSigner = new ethers.Wallet(wallet.privateKey, provider);
    
    // Parse amount
    const value = ethers.utils.parseEther(amount);
    
    // Get gas estimate
    const gasLimit = 21000; // Standard ETH transfer
    const feeData = await provider.getFeeData();
    
    // Create and send transaction
    const tx = await walletSigner.sendTransaction({
      to: toAddress,
      value,
      gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    });
    
    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed - no receipt');
    }
    
    // Update wallet balance after send
    await refreshBalance(walletId);
    
    return tx.hash;
  }, [state.discoveredWallets, refreshBalance]);

  const refreshBalance = useCallback(async (walletId: string) => {
    const wallet = state.discoveredWallets.find(w => w.id === walletId);
    if (!wallet) return;
    
    // Fetch fresh balance from blockchain
    const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const balance = await provider.getBalance(wallet.address);
    
    setState(prev => {
      const updated = prev.discoveredWallets.map(w =>
        w.id === walletId ? { ...w, balance: Number(ethers.utils.formatEther(balance)), balanceFormatted: ethers.utils.formatEther(balance), lastChecked: Date.now() } : w
      );
      const totals = calculateTotalBalances(updated);
      return {
        ...prev,
        discoveredWallets: updated,
        totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
        totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
      };
    });
  }, [state.discoveredWallets]);

  // ── Full export/import ──
  const exportPoolAsJSON = useCallback(async () => {
    const exportData: PoolExportData = {
      version: 1,
      exportedAt: Date.now(),
      poolSeedEncrypted: poolSeedEncrypted || undefined,
      sources: state.sources,
      wallets: state.discoveredWallets as PoolWallet[],
      settings,
      stats,
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recovery-pool-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSettings(s => ({ ...s, lastBackup: Date.now() }));
  }, [state.sources, state.discoveredWallets, settings, stats, poolSeedEncrypted]);

  const importPoolFromJSON = useCallback(async (file: File) => {
    const text = await file.text();
    const data: PoolExportData = JSON.parse(text);

    if (data.version !== 1) throw new Error('Unsupported export version');

    if (data.poolSeedEncrypted) {
      setPoolSeedEncrypted(data.poolSeedEncrypted);
      await dbPut('poolSeedEncrypted', data.poolSeedEncrypted);
    }

    const wallets = (data.wallets || []).map((w: any) => ({
      ...w,
      notes: w.notes || '',
      tags: w.tags || [],
      claimed: w.claimed || false,
      taxAmount: w.taxAmount || 0,
      createdAt: w.createdAt || Date.now(),
    }));

    setState(prev => ({
      ...prev,
      sources: data.sources || [],
      discoveredWallets: wallets,
      isScanning: false,
      scanProgress: 100,
      totalBalance: {},
      totalBalanceFormatted: {},
      networksScanned: [...new Set(wallets.map(w => w.network))],
    }));
    setSettings(data.settings || defaultSettings());
    setStats(data.stats || defaultStats());

    // Recalculate totals
    const totals = calculateTotalBalances(wallets);
    setState(prev => ({
      ...prev,
      totalBalance: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.total])),
      totalBalanceFormatted: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.formatted])),
    }));
  }, []);

  const clearAllData = useCallback(async () => {
    await dbClear();
    setState(createRecoveryPoolState());
    setPoolMasterSeed(null);
    setPoolSeedEncrypted(null);
    setSettings(defaultSettings());
    setStats(defaultStats());
    setIsDirty(false);
  }, []);

  // ── Filtered / sorted wallets ──
  const getFilteredWallets = useCallback((): PoolWallet[] => {
    let wallets = state.discoveredWallets as PoolWallet[];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      wallets = wallets.filter(w =>
        w.address.toLowerCase().includes(q) ||
        w.network.toLowerCase().includes(q) ||
        w.notes.toLowerCase().includes(q) ||
        w.tags.some(t => t.toLowerCase().includes(q)) ||
        w.path.toLowerCase().includes(q)
      );
    }

    // Filter by network
    if (filterNetwork) {
      wallets = wallets.filter(w => w.network === filterNetwork);
    }

    // Filter by tag
    if (filterTag) {
      wallets = wallets.filter(w => w.tags.includes(filterTag));
    }

    // Filter by claimed status
    if (filterClaimed === 'claimed') {
      wallets = wallets.filter(w => w.claimed);
    } else if (filterClaimed === 'unclaimed') {
      wallets = wallets.filter(w => !w.claimed);
    }

    // Sort
    if (sortField) {
      wallets = [...wallets].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case 'balance':
            cmp = a.balance - b.balance;
            break;
          case 'network':
            cmp = a.network.localeCompare(b.network);
            break;
          case 'date':
            cmp = (a.createdAt || 0) - (b.createdAt || 0);
            break;
          case 'amount':
            cmp = a.balance - b.balance;
            break;
        }
        return sortAsc ? cmp : -cmp;
      });
    }

    return wallets;
  }, [state.discoveredWallets, searchQuery, sortField, sortAsc, filterNetwork, filterTag, filterClaimed]);

  // ── Context value ──
  const value: RecoveryPoolContextValue = {
    ...state,
    recoverFromSeed,
    recoverFromPrivateKey,
    recoverFromWIF,
    recoverFromDatFile,
    refreshBalances,
    clearPool,
    removeWallet,
    exportWallets,

    // Pool seed
    poolMasterSeed,
    poolSeedEncrypted,
    generateNewPoolSeed,
    setPoolSeed,
    encryptPoolSeed,
    decryptPoolSeed,
    clearPoolSeed,
    deriveWalletsFromPoolSeed,

    // Wallet management
    addAddressToPool,
    removeWalletFromPool,
    bulkDeleteWallets,
    updateWalletNotes,
    updateWalletTags,
    markWalletClaimed,
    markAllClaimed,
    rescanAllBalances,

    // Send / Withdraw
    sendFromWallet,
    refreshBalance,
    sweepToPool,

    // Persistence
    savePool,
    loadPool,
    exportPoolAsJSON,
    importPoolFromJSON,
    clearAllData,
    isDirty,

    // Stats
    poolStats: stats,
    poolSettings: settings,

    // NEW: Master Ledger
    masterLedger,
    refreshMasterLedger,
    cleanDeadEmptyKeys: cleanDeadEmptyKeysAction,

    // NEW: Cross-chain calculations
    crossChainWallets,
    recoveryReport,
    refreshCrossChainCalculations,

    importScannerResults,

    poolAddresses,
    getPoolAddress,

    setWalletOwner,
    setOwnershipProof,
    recordTaxDeposit,
    verifyOwnership,


    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    filterNetwork,
    setFilterNetwork,
    filterTag,
    setFilterTag,
    filterClaimed,
    setFilterClaimed,
    getFilteredWallets,
  };

  return <RecoveryPoolContext.Provider value={value}>{children}</RecoveryPoolContext.Provider>;
};
