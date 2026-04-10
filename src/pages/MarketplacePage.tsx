import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { useWallet } from '../context/WalletContext';
import { NFT, NFTListing, CURRENCIES, LISTING_TYPES, LISTING_DURATIONS, NETWORKS, SortOption, FilterOption } from '../types/nft';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  Share2,
  Eye,
  X,
  Tag,
  Clock,
  TrendingUp,
  Users,
  ImageIcon,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Wallet,
  PlusCircle,
  ArrowUpDown,
  Sparkles,
  Flame,
  Star,
} from 'lucide-react';

export function MarketplacePage() {
  const mp = useMarketplace();
  const wallet = useWallet();
  const [view, setView] = useState<'browse' | 'my-listings' | 'create'>('browse');
  const [showDetails, setShowDetails] = useState<NFT | null>(null);
  const [showListModal, setShowListModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [offerPrice, setOfferPrice] = useState('');
  const [listingForm, setListingForm] = useState({
    nftId: '',
    price: '',
    currency: 'ETH' as const,
    duration: '7d',
    type: 'fixed' as const,
  });

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBuy = async (listing: NFTListing) => {
    await mp.buyNft(listing.id);
  };

  const handleCreateListing = async () => {
    await mp.createListing(listingForm);
    setShowListModal(false);
    setListingForm({ nftId: '', price: '', currency: 'ETH', duration: '7d', type: 'fixed' });
  };

  const handleMakeOffer = async () => {
    if (showDetails) {
      await mp.makeOffer(showDetails.id, offerPrice, 'ETH');
      setShowOfferModal(false);
      setOfferPrice('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {mp.notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
              n.type === 'success' ? 'bg-green-600' : n.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {n.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{n.message}</span>
            <button onClick={() => mp.dismissNotification(n.id)}><X className="w-4 h-4 ml-2" /></button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <span>NFT Marketplace</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Buy, sell, and discover NFTs across multiple chains
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setView('browse')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${view === 'browse' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Browse</span>
          </button>
          <button
            onClick={() => setView('my-listings')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${view === 'my-listings' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <Tag className="w-4 h-4" />
            <span>My Listings</span>
          </button>
          <button
            onClick={() => {
              if (!wallet.isConnected) {
                wallet.connect();
              }
              setView('create');
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 flex items-center space-x-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List NFT</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp className="w-5 h-5 text-green-400" />} label="Total Volume" value="284,592 ETH" />
        <StatCard icon={<Flame className="w-5 h-5 text-orange-400" />} label="Floor Price" value="0.001 ETH" />
        <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Owners" value="12,847" />
        <StatCard icon={<Star className="w-5 h-5 text-yellow-400" />} label="Items" value={String(mp.filteredNfts.length)} />
      </div>

      {/* Browse View */}
      {view === 'browse' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search NFTs, collections, or token IDs..."
                  value={mp.searchQuery}
                  onChange={(e) => mp.setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2"
                />
              </div>
              <select
                value={mp.selectedNetwork}
                onChange={(e) => mp.setSelectedNetwork(e.target.value)}
                className="bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="all">All Networks</option>
                {NETWORKS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
              <select
                value={mp.selectedCollection}
                onChange={(e) => mp.setSelectedCollection(e.target.value)}
                className="bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="all">All Collections</option>
                {['bayc', 'mayc', 'azuki', 'doodles', 'clonex', 'cryptopunks'].map(c => (
                  <option key={c} value={c}>{c.toUpperCase()}</option>
                ))}
              </select>
              <select
                value={mp.filterBy}
                onChange={(e) => mp.setFilterBy(e.target.value as FilterOption)}
                className="bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="all">All Items</option>
                <option value="buy_now">Buy Now</option>
                <option value="on_auction">On Auction</option>
                <option value="has_offers">Has Offers</option>
              </select>
              <select
                value={mp.sortBy}
                onChange={(e) => mp.setSortBy(e.target.value as SortOption)}
                className="bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low → High</option>
                <option value="price_high">Price: High → Low</option>
                <option value="recently_listed">Recently Listed</option>
                <option value="most_offers">Most Offers</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Price range:</span>
              <input
                type="number"
                placeholder="Min"
                value={mp.priceMin}
                onChange={(e) => mp.setPriceRange(e.target.value, mp.priceMax)}
                className="bg-gray-700 rounded-lg px-3 py-1.5 w-24 text-sm"
              />
              <span className="text-gray-500">—</span>
              <input
                type="number"
                placeholder="Max"
                value={mp.priceMax}
                onChange={(e) => mp.setPriceRange(mp.priceMin, e.target.value)}
                className="bg-gray-700 rounded-lg px-3 py-1.5 w-24 text-sm"
              />
              <span className="text-sm text-gray-400">ETH</span>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">{mp.filteredNfts.length} results</span>
          </div>

          {/* NFT Grid */}
          {mp.filteredNfts.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No NFTs found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mp.filteredNfts.map(nft => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  liked={liked.has(nft.id)}
                  onLike={() => toggleLike(nft.id)}
                  onClick={() => setShowDetails(nft)}
                  onBuy={() => nft.listing && handleBuy(nft.listing)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Listings View */}
      {view === 'my-listings' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your NFTs</h2>
          {mp.userNfts.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No NFTs in your wallet</h3>
              <p className="text-gray-400 mb-4">Connect your wallet and transfer NFTs to see them here</p>
              <button
                onClick={() => setView('browse')}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
              >
                Browse NFTs
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mp.userNfts.map(({ nft }) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  liked={liked.has(nft.id)}
                  onLike={() => toggleLike(nft.id)}
                  onClick={() => setShowDetails(nft)}
                  onList={() => {
                    setShowListModal(true);
                    setListingForm(prev => ({ ...prev, nftId: nft.id }));
                  }}
                  isOwner
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Listing View */}
      {view === 'create' && (
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">Create Listing</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select NFT</label>
              <select
                value={listingForm.nftId}
                onChange={(e) => setListingForm(prev => ({ ...prev, nftId: e.target.value }))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="">Choose an NFT...</option>
                {mp.userNfts.map(({ nft }) => (
                  <option key={nft.id} value={nft.id}>{nft.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Listing Type</label>
              <div className="grid grid-cols-3 gap-2">
                {LISTING_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setListingForm(prev => ({ ...prev, type: t.value }))}
                    className={`px-4 py-2 rounded-lg text-sm ${listingForm.type === t.value ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={listingForm.price}
                  onChange={(e) => setListingForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2"
                  step="0.0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <select
                  value={listingForm.currency}
                  onChange={(e) => setListingForm(prev => ({ ...prev, currency: e.target.value as typeof listingForm.currency }))}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {LISTING_DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setListingForm(prev => ({ ...prev, duration: d.value }))}
                    className={`px-4 py-2 rounded-lg text-sm ${listingForm.duration === d.value ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateListing}
              disabled={mp.isListing || !listingForm.nftId || !listingForm.price}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 px-4 py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              {mp.isListing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating listing...</span>
                </>
              ) : (
                <span>Create Listing</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {showDetails && (
        <NFTDetailModal
          nft={showDetails}
          liked={liked.has(showDetails.id)}
          onLike={() => toggleLike(showDetails.id)}
          onClose={() => setShowDetails(null)}
          onMakeOffer={() => setShowOfferModal(true)}
          onBuy={() => showDetails.listing && handleBuy(showDetails.listing)}
        />
      )}

      {/* Offer Modal */}
      {showOfferModal && showDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowOfferModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Make an Offer</h3>
              <button onClick={() => setShowOfferModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">NFT</label>
                <div className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3">
                  <img src={showDetails.image} alt="" className="w-12 h-12 rounded" />
                  <div>
                    <div className="font-medium text-sm">{showDetails.name}</div>
                    <div className="text-xs text-gray-400">{showDetails.collection}</div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Offer Amount (ETH)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2"
                  step="0.0001"
                />
              </div>
              <button
                onClick={handleMakeOffer}
                disabled={!offerPrice}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-3 rounded-lg"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showListModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowListModal(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">List Your NFT</h3>
              <button onClick={() => setShowListModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <select
                value={listingForm.nftId}
                onChange={(e) => setListingForm(prev => ({ ...prev, nftId: e.target.value }))}
                className="w-full bg-gray-700 rounded-lg px-4 py-2"
              >
                <option value="">Choose an NFT...</option>
                {mp.userNfts.map(({ nft }) => (
                  <option key={nft.id} value={nft.id}>{nft.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Price"
                  value={listingForm.price}
                  onChange={(e) => setListingForm(prev => ({ ...prev, price: e.target.value }))}
                  className="bg-gray-700 rounded-lg px-4 py-2"
                  step="0.0001"
                />
                <select
                  value={listingForm.currency}
                  onChange={(e) => setListingForm(prev => ({ ...prev, currency: e.target.value as typeof listingForm.currency }))}
                  className="bg-gray-700 rounded-lg px-4 py-2"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button
                onClick={handleCreateListing}
                disabled={mp.isListing || !listingForm.nftId || !listingForm.price}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-500 disabled:opacity-50 px-4 py-3 rounded-lg"
              >
                {mp.isListing ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// NFT Card Component
function NFTCard({ nft, liked, onLike, onClick, onBuy, onList, isOwner }: {
  nft: NFT;
  liked: boolean;
  onLike: () => void;
  onClick: () => void;
  onBuy?: () => void;
  onList?: () => void;
  isOwner?: boolean;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden group hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square bg-gray-700">
        {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-gray-700" />}
        <img
          src={nft.image}
          alt={nft.name}
          className={`w-full h-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={(e) => { e.stopPropagation(); onLike(); }}
          className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${liked ? 'bg-red-500/80' : 'bg-black/40 hover:bg-black/60'}`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-white text-white' : 'text-white'}`} />
        </button>
        {nft.listing && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-sm font-medium">{nft.listing.priceFormatted} {nft.listing.currency}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            nft.network === 'ethereum' ? 'bg-blue-500/80' :
            nft.network === 'polygon' ? 'bg-purple-500/80' :
            nft.network === 'arbitrum' ? 'bg-cyan-500/80' : 'bg-red-500/80'
          }`}>
            {nft.network}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-xs text-gray-400 mb-1">{nft.collection}</div>
        <div className="font-medium text-sm truncate mb-2">{nft.name}</div>
        {nft.listing ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Price</div>
              <div className="font-medium">{nft.listing.priceFormatted} {nft.listing.currency}</div>
            </div>
            {onBuy && (
              <button
                onClick={(e) => { e.stopPropagation(); onBuy(); }}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-sm"
              >
                Buy Now
              </button>
            )}
          </div>
        ) : isOwner ? (
          onList && (
            <button
              onClick={(e) => { e.stopPropagation(); onList(); }}
              className="w-full bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm"
            >
              List for Sale
            </button>
          )
        ) : (
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>No active listing</span>
          </div>
        )}
      </div>
    </div>
  );
}

// NFT Detail Modal
function NFTDetailModal({ nft, liked, onLike, onClose, onMakeOffer, onBuy }: {
  nft: NFT;
  liked: boolean;
  onLike: () => void;
  onClose: () => void;
  onMakeOffer: () => void;
  onBuy: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="bg-gray-900 p-4">
            <img src={nft.image} alt={nft.name} className="w-full rounded-lg" />
            <div className="flex items-center justify-between mt-3">
              <div className="flex space-x-2">
                <button onClick={onLike} className={`p-2 rounded ${liked ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                  <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                </button>
                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded"><Share2 className="w-5 h-5" /></button>
                <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded"><ExternalLink className="w-5 h-5" /></button>
              </div>
              <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">{nft.collection}</div>
              <h2 className="text-2xl font-bold">{nft.name}</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  nft.network === 'ethereum' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {nft.network}
                </span>
                <span className="text-xs text-gray-500">{nft.standard}</span>
              </div>
            </div>

            {nft.listing ? (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Current Price</div>
                <div className="text-3xl font-bold">{nft.listing.priceFormatted} {nft.listing.currency}</div>
                {nft.listing.usdPrice && (
                  <div className="text-sm text-gray-400">${nft.listing.usdPrice.toLocaleString()}</div>
                )}
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Expires {new Date(nft.listing.expiresAt).toLocaleDateString()}
                </div>
                <div className="flex space-x-2 mt-4">
                  <button onClick={onBuy} className="flex-1 bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium">
                    Buy Now
                  </button>
                  <button onClick={onMakeOffer} className="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-lg font-medium">
                    Make Offer
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Not Listed</div>
                <button onClick={onMakeOffer} className="w-full bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-medium">
                  Make Offer
                </button>
              </div>
            )}

            {/* Last Sale */}
            {nft.lastSale && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Last Sale</div>
                <div className="font-medium">{nft.lastSale.priceFormatted} {nft.lastSale.currency}</div>
                <div className="text-xs text-gray-500">{new Date(nft.lastSale.timestamp).toLocaleDateString()}</div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-gray-400">{nft.description}</p>
            </div>

            {/* Owner */}
            <div>
              <h3 className="font-medium mb-2">Owned by</h3>
              <div className="text-sm font-mono text-blue-400">{nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</div>
            </div>

            {/* Traits */}
            {nft.traits.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Properties</h3>
                <div className="grid grid-cols-2 gap-2">
                  {nft.traits.map((trait, i) => (
                    <div key={i} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400">{trait.traitType}</div>
                      <div className="font-medium text-sm">{trait.value}</div>
                      {trait.rarity && (
                        <div className="text-xs text-purple-400">{trait.rarity.toFixed(1)}% have this</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offers */}
            {nft.offers && nft.offers.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Offers ({nft.offers.length})</h3>
                <div className="space-y-2">
                  {nft.offers.map(offer => (
                    <div key={offer.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{offer.priceFormatted} {offer.currency}</div>
                        <div className="text-xs text-gray-400">{offer.maker.slice(0, 6)}...{offer.maker.slice(-4)}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Expires {new Date(offer.expiresAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
      {icon}
      <div>
        <div className="text-sm text-gray-400">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
