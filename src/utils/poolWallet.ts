export interface PoolWallet {
  id: string;
  address: string;
  network: string;
  balance: number;
  total_usd: number;
  source: string;
  is_verified: boolean;
  metadata: any;
}

export function generatePoolSeed(): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
