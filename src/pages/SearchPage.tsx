import { useState, useEffect } from 'react';
import { MapPin, DollarSign, Users, Filter } from 'lucide-react';
import { PageType } from '../App';
import { getHostels } from '../lib/hostels';
import HostelCard from '../components/HostelCard';

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    city: '',
    minPrice: '',
    maxPrice: '',
    roomType: '',
  });

  useEffect(() => {
    loadHostels();
  }, []);

  const loadHostels = async () => {
    setLoading(true);
    try {
      const data = await getHostels({
        city: filters.city || undefined,
        minPrice: filters.minPrice ? parseInt(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseInt(filters.maxPrice) : undefined,
        roomType: filters.roomType || undefined,
      });
      setHostels(data);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadHostels();
    setShowFilters(false);
  };

  const handleReset = () => {
    setFilters({
      city: '',
      minPrice: '',
      maxPrice: '',
      roomType: '',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-black mb-8">Search Hostels</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-64 flex-shrink-0`}>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6 lg:mb-0">
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-600 hover:text-black"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6 mt-6 lg:mt-0">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.city}
                      onChange={(e) => handleFilterChange('city', e.target.value)}
                      placeholder="e.g., Bangkok"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                        placeholder="Min"
                        className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                      />
                    </div>
                    <span className="text-gray-600">-</span>
                    <div className="flex-1 relative">
                      <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                        placeholder="Max"
                        className="w-full pl-10 pr-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Room Type
                  </label>
                  <select
                    value={filters.roomType}
                    onChange={(e) => handleFilterChange('roomType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DC143C]"
                  >
                    <option value="">All Types</option>
                    <option value="dorm">Dorm</option>
                    <option value="private">Private</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleApplyFilters}
                    className="flex-1 bg-[#DC143C] text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-80 animate-pulse" />
                ))}
              </div>
            ) : hostels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hostels.map((hostel) => (
                  <HostelCard
                    key={hostel.id}
                    hostel={hostel}
                    onClick={() => onNavigate('detail', hostel.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-black mb-2">
                  No hostels found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters to find more options
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
