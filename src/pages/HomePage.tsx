import { useState, useEffect } from 'react';
import { MapPin, Search, Star } from 'lucide-react';
import { PageType } from '../App';
import { getFeaturedHostels, getHostels } from '../lib/hostels';
import HostelCard from '../components/HostelCard';

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [searchCity, setSearchCity] = useState('');
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatured();
  }, []);

  const loadFeatured = async () => {
    try {
      const data = await getFeaturedHostels(6);
      setFeatured(data);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCity.trim()) {
      onNavigate('search');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Find Your Perfect Hostel
            </h1>
            <p className="text-xl text-gray-600">
              Discover affordable, welcoming accommodations for students worldwide
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="Which city are you looking for?"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3 bg-[#DC143C] text-white font-semibold rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-black mb-2 flex items-center gap-2">
            <Star className="w-8 h-8 text-[#DC143C]" />
            Featured Hostels
          </h2>
          <p className="text-gray-600">
            Top-rated properties recommended for you
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-80 animate-pulse" />
            ))}
          </div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((hostel) => (
              <HostelCard
                key={hostel.id}
                hostel={hostel}
                onClick={() => onNavigate('detail', hostel.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No featured hostels available yet. Check back soon!
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#DC143C] rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Global Network
              </h3>
              <p className="text-gray-600">
                Find hostels in hundreds of cities worldwide
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#DC143C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Verified Reviews
              </h3>
              <p className="text-gray-600">
                Honest feedback from real student travelers
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#DC143C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                Best Deals
              </h3>
              <p className="text-gray-600">
                Compare prices and find the best value
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
