// ElectrumX WebSocket client for real Bitcoin balance/UTXO/transaction queries
// Connects to custom ElectrumX servers over WebSocket using the Electrum protocol

import * as bitcoin from 'bitcoinjs-lib';

export interface ElectrumBalance {
  confirmed: number;    // satoshis
  unconfirmed: number;  // satoshis
}

export interface ElectrumTransaction {
  tx_hash: string;
  height: number;
  fee?: number;
}

export interface ElectrumUTXO {
  tx_hash: string;
  tx_pos: number;
  height: number;
  value: number;
}

export interface ElectrumServer {
  host: string;
  port: number;
  ssl: boolean;
  label: string;
}

// Public ElectrumX servers (fallback rotation)
export const DEFAULT_ELECTRUMX_SERVERS: ElectrumServer[] = [
  { host: 'electrumx-server.1209k.com', port: 50002, ssl: true, label: '1209k' },
  { host: 'electrum.blockstream.info', port: 50002, ssl: true, label: 'Blockstream' },
  { host: 'electrum.hsmiths.com', port: 50002, ssl: true, label: 'HSM' },
  { host: 'fortress.qtornado.com', port: 50002, ssl: true, label: 'qtornado' },
  { host: 'electrum2.cipig.net', port: 20000, ssl: true, label: 'cipig' },
];

// Custom user-configured servers
export function getCustomServers(): ElectrumServer[] {
  try {
    const stored = localStorage.getItem('electrumx_servers');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomServers(servers: ElectrumServer[]) {
  localStorage.setItem('electrumx_servers', JSON.stringify(servers));
}

// Get active server list (custom first, then defaults)
export function getAllServers(): ElectrumServer[] {
  return [...getCustomServers(), ...DEFAULT_ELECTRUMX_SERVERS];
}

// Calculate scripthash from address
export function addressToScripthash(address: string, network?: bitcoin.networks.Network): string {
  const decoded = bitcoin.address.toOutputScript(address, network);
  const hash = bitcoin.crypto.sha256(decoded);
  // Reverse bytes (little-endian)
  return Array.from(hash).reverse().map(b => b.toString(16).padStart(2, '0')).join('');
}

// WebSocket-based ElectrumX client
class ElectrumXClient {
  private ws: WebSocket | null = null;
  private id = 0;
  private pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private server: ElectrumServer | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async connect(server: ElectrumServer): Promise<boolean> {
    this.server = server;
    const url = `${server.ssl ? 'wss' : 'ws'}://${server.host}:${server.port}`;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = async () => {
          try {
            // Negotiate protocol version
            const result = await this.request('server.version', ['PyGUI Wallet 1.0', '1.4.3']);
            if (result) {
              this.reconnectAttempts = 0;
              resolve(true);
            } else {
              reject(new Error('Protocol negotiation failed'));
            }
          } catch (e) {
            reject(e);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id && this.pendingRequests.has(data.id)) {
              const { resolve, reject } = this.pendingRequests.get(data.id)!;
              this.pendingRequests.delete(data.id);
              if (data.error) {
                reject(new Error(data.error.message || JSON.stringify(data.error)));
              } else {
                resolve(data.result);
              }
            }
          } catch {
            // Ignore malformed messages
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
          // Reject all pending requests
          for (const [id, { reject }] of this.pendingRequests) {
            reject(new Error('Connection closed'));
          }
          this.pendingRequests.clear();
        };

        this.ws.onerror = () => {
          reject(new Error(`Failed to connect to ${server.label} (${server.host}:${server.port})`));
        };
      } catch (e) {
        reject(e as Error);
      }
    });
  }

  private request<T = any>(method: string, params: any[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const id = ++this.id;
      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 15000);

      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }));

      // Store original resolve/reject to clear timeout
      const origResolve = resolve;
      const origReject = reject;
      this.pendingRequests.set(id, {
        resolve: (v) => { clearTimeout(timeout); origResolve(v); },
        reject: (e) => { clearTimeout(timeout); origReject(e); },
      });
    });
  }

  async getBalance(address: string, network?: bitcoin.networks.Network): Promise<ElectrumBalance> {
    const scripthash = addressToScripthash(address, network);
    const result = await this.request('blockchain.scripthash.get_balance', [scripthash]);
    return {
      confirmed: result.confirmed / 1e8,
      unconfirmed: result.unconfirmed / 1e8,
    };
  }

  async getHistory(address: string, network?: bitcoin.networks.Network): Promise<ElectrumTransaction[]> {
    const scripthash = addressToScripthash(address, network);
    return this.request('blockchain.scripthash.get_history', [scripthash]);
  }

  async getUTXOs(address: string, network?: bitcoin.networks.Network): Promise<ElectrumUTXO[]> {
    const scripthash = addressToScripthash(address, network);
    return this.request('blockchain.scripthash.listunspent', [scripthash]);
  }

  async getTransaction(txHash: string): Promise<any> {
    return this.request('blockchain.transaction.get', [txHash, true]);
  }

  async getServerFeatures(): Promise<any> {
    return this.request('server.features', []);
  }

  async getTip(): Promise<{ height: number; hex: string }> {
    return this.request('blockchain.headers.subscribe', []);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton client pool with automatic server rotation
class ElectrumXPool {
  private clients = new Map<string, ElectrumXClient>();
  private currentServerIndex = 0;
  private activeServer: string | null = null;

  async getConnection(): Promise<ElectrumXClient> {
    // Return existing active connection
    if (this.activeServer && this.clients.has(this.activeServer)) {
      const client = this.clients.get(this.activeServer)!;
      if (client.isConnected()) return client;
    }

    // Try to connect to servers with rotation
    const servers = getAllServers();
    const tried = new Set<string>();

    for (let i = 0; i < servers.length; i++) {
      const idx = (this.currentServerIndex + i) % servers.length;
      const server = servers[idx];
      const key = `${server.host}:${server.port}`;

      if (tried.has(key)) continue;
      tried.add(key);

      if (this.clients.has(key)) {
        const existing = this.clients.get(key)!;
        if (existing.isConnected()) {
          this.activeServer = key;
          return existing;
        }
        existing.disconnect();
        this.clients.delete(key);
      }

      try {
        const client = new ElectrumXClient();
        await client.connect(server);
        this.clients.set(key, client);
        this.activeServer = key;
        this.currentServerIndex = idx;
        return client;
      } catch {
        // Try next server
      }
    }

    throw new Error('All ElectrumX servers are unreachable');
  }

  async disconnectAll() {
    for (const [, client] of this.clients) {
      client.disconnect();
    }
    this.clients.clear();
    this.activeServer = null;
  }

  getActiveServer(): string | null {
    return this.activeServer;
  }
}

export const electrumPool = new ElectrumXPool();

// High-level balance checking functions (for use with balanceChecker.ts)
export async function checkBTCBalance(address: string, network: string = 'bitcoin'): Promise<{ confirmed: number; unconfirmed: number; source: string }> {
  try {
    const client = await electrumPool.getConnection();
    const net = network === 'testnet' || network === 'bitcoin-testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const balance = await client.getBalance(address, net);
    const server = electrumPool.getActiveServer();
    return {
      confirmed: balance.confirmed,
      unconfirmed: balance.unconfirmed,
      source: `ElectrumX (${server || 'unknown'})`,
    };
  } catch (e) {
    // Fallback: try REST APIs
    return { confirmed: 0, unconfirmed: 0, source: 'electrumx_failed' };
  }
}

export async function getBTCTransactions(address: string, network: string = 'bitcoin'): Promise<ElectrumTransaction[]> {
  try {
    const client = await electrumPool.getConnection();
    const net = network === 'testnet' || network === 'bitcoin-testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    return await client.getHistory(address, net);
  } catch {
    return [];
  }
}

export async function getBTCUTXOs(address: string, network: string = 'bitcoin'): Promise<ElectrumUTXO[]> {
  try {
    const client = await electrumPool.getConnection();
    const net = network === 'testnet' || network === 'bitcoin-testnet' ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    return await client.getUTXOs(address, net);
  } catch {
    return [];
  }
}
