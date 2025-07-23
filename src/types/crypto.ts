import { LucideIcon } from 'lucide-react';

export interface CryptoData {
  symbol: string;
  name: string;
  icon: LucideIcon;
  balance: string;
  price: string;
  change: string;
}

export interface Transaction {
  type: 'sent' | 'received';
  crypto: string;
  amount: string;
  address: string;
  time: string;
}