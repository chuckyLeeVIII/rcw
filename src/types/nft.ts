// NFT Marketplace Types

export interface NFT {
  id: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  imageOriginal?: string;
  animationUrl?: string;
  creator: string;
  owner: string;
  collection: string;
  collectionSlug: string;
  network: 'ethereum' | 'polygon' | 'arbitrum' | 'optimism';
  standard: 'ERC721' | 'ERC1155';
  traits: NFTTrait[];
  lastSale?: NFTSale;
  listing?: NFTListing;
  offers?: NFTOffer[];
  createdAt: number;
}

export interface NFTTrait {
  traitType: string;
  value: string;
  displayType?: string;
  rarity?: number; // percentage
  count?: number;
}

export interface NFTSale {
  price: number;
  priceFormatted: string;
  currency: string;
  usdPrice?: number;
  seller: string;
  buyer: string;
  timestamp: number;
  txHash?: string;
}

export interface NFTListing {
  id: string;
  nftId: string;
  price: number;
  priceFormatted: string;
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  usdPrice?: number;
  seller: string;
  expiresAt: number;
  createdAt: number;
  marketplace: 'opensea' | 'looksrare' | 'x2y2' | 'blur';
  status: 'active' | 'sold' | 'cancelled' | 'expired';
}

export interface NFTOffer {
  id: string;
  nftId: string;
  price: number;
  priceFormatted: string;
  currency: 'ETH' | 'WETH';
  usdPrice?: number;
  maker: string;
  expiresAt: number;
  createdAt: number;
  status: 'active' | 'accepted' | 'cancelled' | 'expired';
}

export interface Collection {
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage: string;
  creator: string;
  verified: boolean;
  floorPrice: number;
  volumeTotal: number;
  volume24h: number;
  itemsTotal: number;
  ownersTotal: number;
}

export interface UserNFT {
  nft: NFT;
  acquiredAt: number;
  acquiredPrice?: number;
  source: 'mint' | 'purchase' | 'transfer' | 'airdrop';
}

export interface ListingFormData {
  nftId: string;
  price: string;
  currency: 'ETH' | 'WETH' | 'USDC' | 'DAI';
  duration: string; // e.g. '1d', '3d', '7d', '30d'
  type: 'fixed' | 'auction' | 'declining';
  reservePrice?: string;
}

export type SortOption = 'price_low' | 'price_high' | 'newest' | 'oldest' | 'recently_listed' | 'most_offers';
export type FilterOption = 'all' | 'buy_now' | 'on_auction' | 'has_offers';

export const CURRENCIES = ['ETH', 'WETH', 'USDC', 'DAI'] as const;
export const LISTING_TYPES = [
  { value: 'fixed' as const, label: 'Fixed Price' },
  { value: 'auction' as const, label: 'Timed Auction' },
  { value: 'declining' as const, label: 'Dutch Auction' },
];
export const LISTING_DURATIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

export const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: 'blue' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', color: 'purple' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', color: 'cyan' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP', color: 'red' },
];
