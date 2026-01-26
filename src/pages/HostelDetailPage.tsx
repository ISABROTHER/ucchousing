import { useState, useEffect } from 'react';
import { Star, MapPin, Users, Wifi, Clock, AlertCircle, ChevronLeft } from 'lucide-react';
import { PageType } from '../App';
import { getHostelById } from '../lib/hostels';
import { getHostelReviews } from '../lib/reviews';

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
  const [hostel, setHostel] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    loadHostel();
  }, [hostelId]);

  const loadHostel = async () => {
    setLoading(true);
    try {
      const data = await getHostelById(hostelId);
      setHostel(data);
      const reviewsData = await getHostelReviews(hostelId);
      setReviews(reviewsData);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !hostel) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hostel details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => onNavigate('search')}
          className="flex items-center gap-2 text-[#DC143C] font-semibold mb-6 hover:text-red-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="relative bg-gray-200 rounded-lg overflow-hidden h-96 mb-4 flex items-center justify-center">
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
                <div className="absolute top-4 left-4 bg-[#DC143C] text-white px-4 py-2 rounded-full font-semibold">
                  Verified
                </div>
              )}
            </div>

            {hostel.images && hostel.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {hostel.images.map((image, idx) => (
                  <button
                    key={image.id}
                    onClick={() => setImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      imageIndex === idx ? 'border-[#DC143C]' : 'border-gray-300'
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

          <div className="bg-gray-50 rounded-lg p-6 h-fit sticky top-24">
            <div className="mb-6">
              <div className="text-4xl font-bold text-[#DC143C] mb-2">
                ${hostel.price_per_night}
              </div>
              <p className="text-gray-600">per night</p>
            </div>

            {user && userProfile?.user_type === 'student' ? (
              <button
                onClick={() => onNavigate('booking', hostelId)}
                className="w-full bg-[#DC143C] text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Book Now
              </button>
            ) : user ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Only students can make bookings
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="w-full bg-[#DC143C] text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign In to Book
              </button>
            )}

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-[#DC143C]" />
                <span>{hostel.location}, {hostel.city}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Users className="w-5 h-5 text-[#DC143C]" />
                <span className="capitalize">{hostel.room_type} rooms</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5 text-[#DC143C]" />
                <span>{hostel.beds_available} beds available</span>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Star className="w-5 h-5 fill-[#DC143C] text-[#DC143C]" />
                <span className="font-semibold text-black">
                  {hostel.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-600">
                  ({hostel.review_count} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-black mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">
                {hostel.description || 'No description available for this hostel yet.'}
              </p>
            </div>

            {hostel.amenities && hostel.amenities.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-black mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hostel.amenities.map((amenity) => (
                    <div
                      key={amenity.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <Wifi className="w-5 h-5 text-[#DC143C]" />
                      <span className="text-gray-700">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-black mb-6">
                Reviews ({reviews.length})
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-black">
                            {review.user_profiles?.full_name}
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
                                  ? 'fill-[#DC143C] text-[#DC143C]'
                                  : 'text-gray-300'
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
                <p className="text-gray-600 text-center py-8">
                  No reviews yet. Be the first to review!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
