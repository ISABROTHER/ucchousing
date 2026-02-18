import { useState, useEffect } from 'react';
import { Heart, MapPin, Star, Bed, Trash2, Search } from 'lucide-react';
import { getWishlist, removeFromWishlist, WishlistItem } from '../lib/wishlist';
import { PageType } from '../App';

interface WishlistPageProps {
  user: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function WishlistPage({ user, onNavigate }: WishlistPageProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadWishlist();
  }, [user]);

  async function loadWishlist() {
    try {
      const data = await getWishlist(user.id);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(hostelId: string) {
    setRemoving(hostelId);
    try {
      await removeFromWishlist(user.id, hostelId);
      setItems(prev => prev.filter(i => i.hostel_id !== hostelId));
    } finally {
      setRemoving(null);
    }
  }

  const getHostelImage = (item: WishlistItem): string => {
    const images = item.hostels?.hostel_images;
    if (images && images.length > 0) {
      const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
      return sorted[0].image_url;
    }
    return 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?w=600';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to view saved hostels</h3>
          <button
            onClick={() => onNavigate('auth')}
            className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#DC143C]" />
            </div>
            Saved Hostels
          </h1>
          <p className="text-gray-500 mt-2">
            {items.length > 0 ? `${items.length} hostel${items.length !== 1 ? 's' : ''} saved` : 'Your saved accommodations'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No saved hostels yet</h3>
            <p className="text-gray-500 mb-6">Tap the heart icon on any hostel to save it for later</p>
            <button
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#DC143C] text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <Search className="w-5 h-5" />
              Browse Hostels
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map(item => {
              const hostel = item.hostels;
              if (!hostel) return null;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
                >
                  <div className="relative overflow-hidden aspect-[4/3]">
                    <img
                      src={getHostelImage(item)}
                      alt={hostel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?w=600';
                      }}
                    />
                    <button
                      onClick={() => handleRemove(item.hostel_id)}
                      disabled={removing === item.hostel_id}
                      className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {removing === item.hostel_id ? (
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      )}
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-700 capitalize">
                        {hostel.room_type}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-gray-900 leading-tight">{hostel.name}</h3>
                      {hostel.rating > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-gray-700">{hostel.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{hostel.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                      <Bed className="w-3.5 h-3.5" />
                      {hostel.beds_available} beds available
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xl font-bold text-gray-900">GHS {hostel.price_per_night.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-1">/ semester</span>
                      </div>
                      <button
                        onClick={() => onNavigate('detail', hostel.id)}
                        className="px-4 py-2 bg-[#DC143C] text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
