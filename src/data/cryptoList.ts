import { 
  CircleDollarSign, 
  Coins,
  Wallet,
  CreditCard,
  BadgeDollarSign,
  Banknote
} from 'lucide-react';

export const cryptoList = [
  // Major Cryptocurrencies
  { symbol: 'BTC', name: 'Bitcoin', icon: Wallet, balance: '0.00000000', price: '71,250.00', change: '+2.5%' },
  { symbol: 'ETH', name: 'Ethereum', icon: CreditCard, balance: '0.00000000', price: '3,980.00', change: '+1.8%' },
  { symbol: 'USDT', name: 'Tether', icon: CircleDollarSign, balance: '0.00', price: '1.00', change: '0.0%' },
  { symbol: 'USDC', name: 'USD Coin', icon: BadgeDollarSign, balance: '0.00', price: '1.00', change: '0.0%' },
  { symbol: 'BNB', name: 'Binance Coin', icon: Banknote, balance: '0.00000000', price: '575.20', change: '+2.1%' },
  
  // Popular Altcoins
  { symbol: 'DOGE', name: 'Dogecoin', icon: Coins, balance: '0.00000000', price: '0.18', change: '+5.2%' },
  { symbol: 'LTC', name: 'Litecoin', icon: Coins, balance: '0.00000000', price: '95.40', change: '-0.8%' },
  { symbol: 'XRP', name: 'Ripple', icon: Coins, balance: '0.00000000', price: '0.62', change: '+1.2%' },
  { symbol: 'ADA', name: 'Cardano', icon: Coins, balance: '0.00000000', price: '0.72', change: '-1.5%' },
  { symbol: 'DOT', name: 'Polkadot', icon: Coins, balance: '0.00000000', price: '9.85', change: '+3.2%' },
  
  // DeFi Tokens
  { symbol: 'AAVE', name: 'Aave', icon: Coins, balance: '0.00000000', price: '145.20', change: '+2.8%' },
  { symbol: 'UNI', name: 'Uniswap', icon: Coins, balance: '0.00000000', price: '12.85', change: '-0.5%' },
  { symbol: 'CAKE', name: 'PancakeSwap', icon: Coins, balance: '0.00000000', price: '3.95', change: '+1.7%' },
  { symbol: 'SUSHI', name: 'SushiSwap', icon: Coins, balance: '0.00000000', price: '2.45', change: '-0.9%' },
  { symbol: 'CRV', name: 'Curve DAO', icon: Coins, balance: '0.00000000', price: '0.75', change: '+3.1%' },
  
  // Layer 1 & 2 Solutions
  { symbol: 'SOL', name: 'Solana', icon: Coins, balance: '0.00000000', price: '145.80', change: '+6.3%' },
  { symbol: 'AVAX', name: 'Avalanche', icon: Coins, balance: '0.00000000', price: '42.50', change: '+1.9%' },
  { symbol: 'MATIC', name: 'Polygon', icon: Coins, balance: '0.00000000', price: '1.25', change: '+4.1%' },
  { symbol: 'OP', name: 'Optimism', icon: Coins, balance: '0.00000000', price: '3.85', change: '+5.4%' },
  { symbol: 'ARB', name: 'Arbitrum', icon: Coins, balance: '0.00000000', price: '1.95', change: '+2.8%' },
  
  // Meme Coins
  { symbol: 'SHIB', name: 'Shiba Inu', icon: Coins, balance: '0.00000000', price: '0.00003', change: '+7.5%' },
  { symbol: 'PEPE', name: 'Pepe', icon: Coins, balance: '0.00000000', price: '0.000002', change: '+12.5%' },
  { symbol: 'FLOKI', name: 'Floki Inu', icon: Coins, balance: '0.00000000', price: '0.00004', change: '+9.3%' },
  
  // Gaming & Metaverse
  { symbol: 'SAND', name: 'The Sandbox', icon: Coins, balance: '0.00000000', price: '0.65', change: '+2.1%' },
  { symbol: 'MANA', name: 'Decentraland', icon: Coins, balance: '0.00000000', price: '0.58', change: '-1.2%' },
  { symbol: 'AXS', name: 'Axie Infinity', icon: Coins, balance: '0.00000000', price: '9.85', change: '+3.4%' },
  
  // Oracle & Infrastructure
  { symbol: 'LINK', name: 'Chainlink', icon: Coins, balance: '0.00000000', price: '18.45', change: '+2.7%' },
  { symbol: 'GRT', name: 'The Graph', icon: Coins, balance: '0.00000000', price: '0.35', change: '+1.8%' },
  { symbol: 'FIL', name: 'Filecoin', icon: Coins, balance: '0.00000000', price: '7.85', change: '-0.7%' },
  
  // Exchange Tokens
  { symbol: 'CRO', name: 'Cronos', icon: Coins, balance: '0.00000000', price: '0.12', change: '+1.5%' },
  { symbol: 'FTT', name: 'FTX Token', icon: Coins, balance: '0.00000000', price: '1.85', change: '-2.1%' },
  { symbol: 'KCS', name: 'KuCoin Token', icon: Coins, balance: '0.00000000', price: '12.45', change: '+0.9%' },
  
  // Additional Popular Altcoins
  { symbol: 'ATOM', name: 'Cosmos', icon: Coins, balance: '0.00000000', price: '12.85', change: '+2.1%' },
  { symbol: 'ALGO', name: 'Algorand', icon: Coins, balance: '0.00000000', price: '0.25', change: '+1.4%' },
  { symbol: 'XLM', name: 'Stellar', icon: Coins, balance: '0.00000000', price: '0.15', change: '-0.3%' },
  { symbol: 'VET', name: 'VeChain', icon: Coins, balance: '0.00000000', price: '0.045', change: '+3.8%' },
  { symbol: 'NEAR', name: 'NEAR Protocol', icon: Coins, balance: '0.00000000', price: '3.85', change: '+4.2%' },
  { symbol: 'FTM', name: 'Fantom', icon: Coins, balance: '0.00000000', price: '0.85', change: '+5.7%' },
  { symbol: 'ONE', name: 'Harmony', icon: Coins, balance: '0.00000000', price: '0.025', change: '+2.3%' },
  { symbol: 'HBAR', name: 'Hedera', icon: Coins, balance: '0.00000000', price: '0.12', change: '+1.6%' },
  { symbol: 'ZIL', name: 'Zilliqa', icon: Coins, balance: '0.00000000', price: '0.035', change: '+4.5%' }
];