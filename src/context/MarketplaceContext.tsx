import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { NFT, NFTListing, NFTOffer, ListingFormData, SortOption, FilterOption, Collection, UserNFT } from '../types/nft';

// Mock NFT data generator
const MOCK_COLLECTIONS = [
  { name: 'Bored Ape Yacht Club', slug: 'bayc', verified: true, floorPrice: 28.5 },
  { name: 'Mutant Ape Yacht Club', slug: 'mayc', verified: true, floorPrice: 12.3 },
  { name: 'Azuki', slug: 'azuki', verified: true, floorPrice: 8.7 },
  { name: 'Doodles', slug: 'doodles', verified: true, floorPrice: 3.2 },
  { name: 'CloneX', slug: 'clonex', verified: true, floorPrice: 2.8 },
  { name: 'CryptoPunks', slug: 'cryptopunks', verified: true, floorPrice: 45.0 },
  { name: 'Art Blocks', slug: 'artblocks', verified: true, floorPrice: 0.5 },
  { name: 'Pudgy Penguins', slug: 'pudgypenguins', verified: true, floorPrice: 5.1 },
  { name: 'Cool Cats', slug: 'coolcats', verified: true, floorPrice: 1.2 },
  { name: 'World of Women', slug: 'wow', verified: true, floorPrice: 1.8 },
];

const TRAIT_TYPES = ['Background', 'Fur', 'Eyes', 'Mouth', 'Clothes', 'Hat', 'Accessories'];
const TRAIT_VALUES: Record<string, string[]> = {
  Background: ['Blue', 'Orange', 'Purple', 'Gray', 'Aquamarine', 'Yellow', 'Army Green'],
  Fur: ['Brown', 'Black', 'Golden', 'White', 'Red', 'Cheetah', 'Zombie'],
  Eyes: ['Bored', 'Angry', 'Sleepy', 'Laser Eyes', '3D Glasses', 'Sunglasses'],
  Mouth: ['Bored', 'Grin', 'Phoneme L', 'Rage', 'Dumbfounded', 'Tongue Out'],
  Clothes: ['Striped Tee', 'Leather Jacket', 'Tuxedo', 'Sailor Shirt', 'Hawaiian'],
  Hat: ['Beanie', 'Cowboy Hat', 'Crown', 'Bandana', 'Top Hat', 'None'],
  Accessories: ['Gold Chain', 'Earring', 'Watch', 'None'],
};

const CURRENCIES = ['ETH', 'WETH', 'USDC', 'DAI'] as const;

function generateMockNFT(index: number): NFT {
  const collection = MOCK_COLLECTIONS[index % MOCK_COLLECTIONS.length];
  const tokenId = (index * 7 + 137) % 10000;
  const hasListing = Math.random() > 0.4;
  const price = (Math.random() * 10 + 0.1).toFixed(4);

  const traits: NFT['traits'] = [];
  const numTraits = 3 + Math.floor(Math.random() * 4);
  const usedTypes = new Set<string>();
  for (let i = 0; i < numTraits; i++) {
    const type = TRAIT_TYPES[Math.floor(Math.random() * TRAIT_TYPES.length)];
    if (usedTypes.has(type)) continue;
    usedTypes.add(type);
    const values = TRAIT_VALUES[type] || ['Rare'];
    const value = values[Math.floor(Math.random() * values.length)];
    traits.push({
      traitType: type,
      value,
      rarity: Math.random() * 30 + 1,
    });
  }

  return {
    id: `nft-${index}`,
    contractAddress: `0x${(index * 123456789).toString(16).padStart(40, '0')}`,
    tokenId: String(tokenId),
    name: `${collection.name} #${tokenId}`,
    description: `A unique NFT from the ${collection.name} collection. Token ID: ${tokenId}`,
    image: `https://picsum.photos/seed/nft${index}/400/400`,
    creator: `0x${(index * 987654321).toString(16).padStart(40, '0')}`,
    owner: `0x${(index * 555555555).toString(16).padStart(40, '0')}`,
    collection: collection.name,
    collectionSlug: collection.slug,
    network: ['ethereum', 'polygon', 'arbitrum', 'optimism'][index % 4] as NFT['network'],
    standard: index % 3 === 0 ? 'ERC1155' : 'ERC721',
    traits,
    lastSale: Math.random() > 0.3 ? {
      price: parseFloat(price) * (0.5 + Math.random()),
      priceFormatted: (parseFloat(price) * (0.5 + Math.random())).toFixed(4),
      currency: 'ETH',
      seller: `0x${(index * 111111111).toString(16).padStart(40, '0')}`,
      buyer: `0x${(index * 222222222).toString(16).padStart(40, '0')}`,
      timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    } : undefined,
    listing: hasListing ? {
      id: `listing-${index}`,
      nftId: `nft-${index}`,
      price: parseFloat(price),
      priceFormatted: price,
      currency: CURRENCIES[index % 4],
      seller: `0x${(index * 333333333).toString(16).padStart(40, '0')}`,
      expiresAt: Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      marketplace: ['opensea', 'looksrare', 'x2y2', 'blur'][index % 4] as NFTListing['marketplace'],
      status: 'active',
    } : undefined,
    offers: Math.random() > 0.6 ? [{
      id: `offer-${index}`,
      nftId: `nft-${index}`,
      price: parseFloat(price) * 0.8,
      priceFormatted: (parseFloat(price) * 0.8).toFixed(4),
      currency: 'ETH',
      maker: `0x${(index * 444444444).toString(16).padStart(40, '0')}`,
      expiresAt: Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000,
      status: 'active',
    }] : [],
    createdAt: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
  };
}

const ALL_NFTS: NFT[] = Array.from({ length: 48 }, (_, i) => generateMockNFT(i));

const USER_NFT_LISTINGS: UserNFT[] = Array.from({ length: 12 }, (_, i) => ({
  nft: generateMockNFT(i + 100),
  acquiredAt: Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
  acquiredPrice: Math.random() * 5 + 0.1,
  source: ['mint', 'purchase', 'transfer', 'airdrop'][i % 4] as UserNFT['source'],
}));

interface MarketplaceState {
  allNfts: NFT[];
  userNfts: UserNFT[];
  listings: NFTListing[];
  activeListings: NFTListing[];
  selectedNft: NFT | null;
  isListing: boolean;
  searchQuery: string;
  sortBy: SortOption;
  filterBy: FilterOption;
  selectedNetwork: string;
  selectedCollection: string;
  priceMin: string;
  priceMax: string;
  notifications: Array<{ id: string; type: 'success' | 'error' | 'info'; message: string }>;
}

interface MarketplaceContextValue extends MarketplaceState {
  selectNft: (nft: NFT | null) => void;
  createListing: (form: ListingFormData) => Promise<void>;
  cancelListing: (listingId: string) => void;
  updateListingPrice: (listingId: string, newPrice: string) => void;
  buyNft: (listingId: string) => Promise<void>;
  makeOffer: (nftId: string, price: string, currency: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSortBy: (s: SortOption) => void;
  setFilterBy: (f: FilterOption) => void;
  setSelectedNetwork: (n: string) => void;
  setSelectedCollection: (c: string) => void;
  setPriceRange: (min: string, max: string) => void;
  dismissNotification: (id: string) => void;
  filteredNfts: NFT[];
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
};

let idCounter = 0;
const nextId = () => `mp-${++idCounter}-${Date.now()}`;

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<MarketplaceState>({
    allNfts: ALL_NFTS,
    userNfts: USER_NFT_LISTINGS,
    listings: ALL_NFTS.filter(n => n.listing).map(n => n.listing!),
    activeListings: ALL_NFTS.filter(n => n.listing?.status === 'active').map(n => n.listing!),
    selectedNft: null,
    isListing: false,
    searchQuery: '',
    sortBy: 'newest',
    filterBy: 'all',
    selectedNetwork: 'all',
    selectedCollection: 'all',
    priceMin: '',
    priceMax: '',
    notifications: [],
  });

  const selectNft = useCallback((nft: NFT | null) => {
    setState(prev => ({ ...prev, selectedNft: nft }));
  }, []);

  const createListing = useCallback(async (form: ListingFormData) => {
    setState(prev => ({ ...prev, isListing: true }));
    await new Promise(r => setTimeout(r, 1500));

    const userNft = state.userNfts.find(u => u.nft.id === form.nftId);
    if (!userNft) {
      addNotification('error', 'NFT not found');
      setState(prev => ({ ...prev, isListing: false }));
      return;
    }

    const listing: NFTListing = {
      id: nextId(),
      nftId: form.nftId,
      price: parseFloat(form.price),
      priceFormatted: form.price,
      currency: form.currency,
      seller: userNft.nft.owner,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      marketplace: 'opensea',
      status: 'active',
    };

    setState(prev => ({
      ...prev,
      listings: [...prev.listings, listing],
      activeListings: [...prev.activeListings, listing],
      isListing: false,
      allNfts: prev.allNfts.map(n => n.id === form.nftId ? { ...n, listing } : n),
    }));

    addNotification('success', `${userNft.nft.name} listed for ${form.price} ${form.currency}!`);
  }, [state.userNfts]);

  const cancelListing = useCallback((listingId: string) => {
    setState(prev => ({
      ...prev,
      listings: prev.listings.filter(l => l.id !== listingId),
      activeListings: prev.activeListings.filter(l => l.id !== listingId),
      allNfts: prev.allNfts.map(n => n.listing?.id === listingId ? { ...n, listing: undefined } : n),
    }));
    addNotification('info', 'Listing cancelled');
  }, []);

  const updateListingPrice = useCallback((listingId: string, newPrice: string) => {
    setState(prev => ({
      ...prev,
      listings: prev.listings.map(l =>
        l.id === listingId ? { ...l, price: parseFloat(newPrice), priceFormatted: newPrice } : l
      ),
      activeListings: prev.activeListings.map(l =>
        l.id === listingId ? { ...l, price: parseFloat(newPrice), priceFormatted: newPrice } : l
      ),
    }));
    addNotification('success', 'Price updated');
  }, []);

  const buyNft = useCallback(async (listingId: string) => {
    await new Promise(r => setTimeout(r, 1000));
    setState(prev => ({
      ...prev,
      activeListings: prev.activeListings.filter(l => l.id !== listingId),
      allNfts: prev.allNfts.map(n => {
        if (n.listing?.id === listingId) {
          return { ...n, listing: { ...n.listing, status: 'sold' as const } };
        }
        return n;
      }),
    }));
    addNotification('success', 'NFT purchased successfully!');
  }, []);

  const makeOffer = useCallback(async (nftId: string, price: string, _currency: string) => {
    await new Promise(r => setTimeout(r, 800));
    const offer: NFTOffer = {
      id: nextId(),
      nftId,
      price: parseFloat(price),
      priceFormatted: price,
      currency: 'ETH',
      maker: '0xUserAddress123',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
      status: 'active',
    };
    setState(prev => ({
      ...prev,
      allNfts: prev.allNfts.map(n => n.id === nftId ? { ...n, offers: [...(n.offers || []), offer] } : n),
    }));
    addNotification('success', `Offer of ${price} ETH submitted!`);
  }, []);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = nextId();
    setState(prev => ({ ...prev, notifications: [...prev.notifications, { id, type, message }] }));
    setTimeout(() => dismissNotification(id), 4000);
  };

  const dismissNotification = (id: string) => {
    setState(prev => ({ ...prev, notifications: prev.notifications.filter(n => n.id !== id) }));
  };

  const setSearchQuery = useCallback((q: string) => setState(prev => ({ ...prev, searchQuery: q })), []);
  const setSortBy = useCallback((s: SortOption) => setState(prev => ({ ...prev, sortBy: s })), []);
  const setFilterBy = useCallback((f: FilterOption) => setState(prev => ({ ...prev, filterBy: f })), []);
  const setSelectedNetwork = useCallback((n: string) => setState(prev => ({ ...prev, selectedNetwork: n })), []);
  const setSelectedCollection = useCallback((c: string) => setState(prev => ({ ...prev, selectedCollection: c })), []);
  const setPriceRange = useCallback((priceMin: string, priceMax: string) => setState(prev => ({ ...prev, priceMin, priceMax })), []);

  // Filtered and sorted NFTs
  const filteredNfts = state.allNfts.filter(nft => {
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      if (!nft.name.toLowerCase().includes(q) &&
          !nft.collection.toLowerCase().includes(q) &&
          !nft.tokenId.includes(q)) return false;
    }
    if (state.selectedNetwork !== 'all' && nft.network !== state.selectedNetwork) return false;
    if (state.selectedCollection !== 'all' && nft.collectionSlug !== state.selectedCollection) return false;
    if (state.filterBy === 'buy_now' && !nft.listing) return false;
    if (state.filterBy === 'on_auction' && nft.listing?.status !== 'active') return false;
    if (state.priceMin && nft.listing && nft.listing.price < parseFloat(state.priceMin)) return false;
    if (state.priceMax && nft.listing && nft.listing.price > parseFloat(state.priceMax)) return false;
    return true;
  }).sort((a, b) => {
    switch (state.sortBy) {
      case 'price_low': return (a.listing?.price || Infinity) - (b.listing?.price || Infinity);
      case 'price_high': return (b.listing?.price || 0) - (a.listing?.price || 0);
      case 'newest': return b.createdAt - a.createdAt;
      case 'oldest': return a.createdAt - b.createdAt;
      case 'recently_listed': return (b.listing?.createdAt || 0) - (a.listing?.createdAt || 0);
      case 'most_offers': return (b.offers?.length || 0) - (a.offers?.length || 0);
      default: return 0;
    }
  });

  const value: MarketplaceContextValue = {
    ...state,
    selectNft,
    createListing,
    cancelListing,
    updateListingPrice,
    buyNft,
    makeOffer,
    setSearchQuery,
    setSortBy,
    setFilterBy,
    setSelectedNetwork,
    setSelectedCollection,
    setPriceRange,
    dismissNotification,
    filteredNfts,
  };

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
};
