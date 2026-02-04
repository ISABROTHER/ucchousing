import { useState, useEffect } from 'react';
import { Star, MapPin, Users, Wifi, Clock, AlertCircle, ChevronLeft, Zap } from 'lucide-react';
import { PageType } from '../App';
import { getHostelById } from '../lib/hostels';
import { getHostelReviews } from '../lib/reviews';

// --- Manual Data Fallback (Fixes "Not Found" for featured cards) ---
const MANUAL_HOSTELS: Record<string, any> = {
  "nana-agyoma-manual": {
    id: "nana-agyoma-manual",
    name: "Nana Agyoma Hostel",
    location: "Amamoma",
    city: "Cape Coast",
    price_per_night: 2800,
    room_type: "2 in a room",
    beds_available: 8,
    rating: 4.5,
    review_count: 12,
    verified: true,
    description: "A comfortable and secure hostel located in the heart of Amamoma. Close to campus with reliable water and electricity supply.",
    images: [
      { id: '1', image_url: "https://i.imgur.com/luYRCIq.jpeg" },
      { id: '2', image_url: "https://i.imgur.com/peh4mP5.jpeg" },
      { id: '3', image_url: "https://i.imgur.com/CKdT7Di.jpeg" },
      { id: '4', image_url: "https://i.imgur.com/Ci2Vn7D.jpeg" },
    ],
    amenities: [
      { id: '1', name: "Free Wi-Fi" },
      { id: '2', name: "Water Flow" },
      { id: '3', name: "Security" },
      { id: '4', name: "Study Room" }
    ]
  },
  "adoration-home-plus-manual": {
    id: "adoration-home-plus-manual",
    name: "Adoration Home Plus Hostel",
    location: "Ayensu",
    city: "Cape Coast",
    price_per_night: 3200,
    room_type: "1 in a room",
    beds_available: 4,
    rating: 4.8,
    review_count: 8,
    verified: true,
    description: "Premium accommodation for students who value privacy and comfort. Located in a serene environment at Ayensu.",
    images: [
      { id: '1', image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png" },
      { id: '2', image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration1-300x300.jpg" },
      { id: '3', image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1-300x300.png" },
    ],
    amenities: [
      { id: '1', name: "AC" },
      { id: '2', name: "Generator" },
      { id: '3', name: "Kitchen" },
      { id: '4', name: "DSTV" }
    ]
  }
};

interface HostelDetailPageProps {
  hostelId: string;
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HostelDetailPage({
  hostelId,
  user,
  userProfile,
  onNavigate,
}: HostelDetailPageProps) {
  const [hostel, setHostel] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    loadHostel();
  }, [hostelId]);

  const loadHostel = async () => {
    setLoading(true);
    try {
      // 1. Try fetching from API
      let data = await getHostelById(hostelId);
      
      // 2. Fallback to manual data if not found in API
      if (!data && MANUAL_HOSTELS[hostelId]) {
        console.log("Using manual fallback data for:", hostelId);
        data = MANUAL_HOSTELS[hostelId];
      }

      setHostel(data);

      // Only fetch reviews if we actually found a hostel (and it's not a manual one without reviews)
      if (data && !MANUAL_HOSTELS[hostelId]) {
        const reviewsData = await getHostelReviews(hostelId);
        setReviews(reviewsData);
      }
    } catch (err) {
      console.error("Error loading hostel:", err);
      // Final fallback attempt in case of error
      if (MANUAL_HOSTELS[hostelId]) {
        setHostel(MANUAL_HOSTELS[hostelId]);
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hostel details...</p>
        </div>
      </div>
    );
  }

  // 2. Not Found State
  if (!hostel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Hostel Not Found</h2>
          <p className="text-gray-600 mb-6">The hostel you are looking for might have been removed or does not exist.</p>
          <button
            onClick={() => onNavigate('search')}
            className="bg-[#DC143C] text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const bedsLeft = hostel.beds_available || 0;
  const scarcityText = bedsLeft > 6 ? "6+ Rooms Left" : `${bedsLeft} Rooms Left`;

  // 3. Success State
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('search')}
          className="flex items-center gap-2 text-[#DC143C] font-semibold mb-6 hover:text-red-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* LEFT COLUMN: IMAGES */}
          <div className="lg:col-span-2">
            <div className="relative bg-gray-200 rounded-lg overflow-hidden h-96 mb-4 flex items-center justify-center shadow-sm">
              {hostel.images && hostel.images.length > 0 ? (
                <img
                  src={hostel.images[imageIndex]?.image_url}
                  alt={`${hostel.name} - image ${imageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-4xl">🏠</div>
              )}
              {hostel.verified && (
                <div className="absolute top-4 left-4 bg-[#DC143C] text-white px-4 py-2 rounded-full font-semibold shadow-md">
                  Verified
                </div>
              )}
            </div>

            {hostel.images && hostel.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {hostel.images.map((image: any, idx: number) => (
                  <button
                    key={image.id || idx}
                    onClick={() => setImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                      imageIndex === idx ? 'border-[#DC143C] scale-105' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: BOOKING CARD */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-fit sticky top-24">
            
            {/* LIVE INDICATOR */}
            <div className="flex items-center gap-2 mb-4 bg-red-50 w-fit px-3 py-1.5 rounded-full border border-red-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC143C]"></span>
              </span>
              <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wide">
                Live • {scarcityText}
              </span>
            </div>

            <div className="mb-6">
              <div className="text-4xl font-extrabold text-gray-900 mb-1 flex items-baseline gap-1">
                <span className="text-[#DC143C]">₵{hostel.price_per_night}</span>
              </div>
              <p className="text-gray-500 text-sm font-medium">per semester (approx)</p>
            </div>

            {user && userProfile?.user_type === 'student' ? (
              <button
                onClick={() => onNavigate('booking', hostelId)}
                className="group relative w-full bg-gradient-to-r from-[#DC143C] to-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  BOOK NOW
                  <Zap className="w-4 h-4 fill-white" />
                </span>
              </button>
            ) : user ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Only students can make bookings
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all hover:scale-[1.02]"
              >
                Sign In to Book
              </button>
            )}

            <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{hostel.location}, {hostel.city}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="capitalize font-medium">{hostel.room_type} rooms</span>
              </div>

              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{hostel.beds_available} beds available</span>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-900 text-lg">
                    {hostel.rating?.toFixed(1) || "N/A"}
                  </span>
                </div>
                <span className="text-sm text-gray-500 font-medium hover:text-gray-700 underline cursor-pointer">
                  {hostel.review_count || 0} reviews
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: DETAILS & REVIEWS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed text-lg">
                {hostel.description || 'No description available for this hostel yet.'}
              </p>
            </div>

            {hostel.amenities && hostel.amenities.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hostel.amenities.map((amenity: any) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#DC143C]/30 transition-colors"
                    >
                      <Wifi className="w-5 h-5 text-[#DC143C]" />
                      <span className="text-gray-700 font-medium">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Reviews ({reviews.length})
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900">
                            {review.user_profiles?.full_name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">
                    No reviews yet. Be the first to review!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 