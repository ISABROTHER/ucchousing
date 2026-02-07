import { useEffect, useState } from "react";
import { Star, MapPin, Users, Wifi, Clock, AlertCircle, ChevronLeft, Zap, Send, GitCompareArrows } from "lucide-react";
import { PageType } from "../App";
import { getHostelById } from "../lib/hostels";
import { getHostelReviews, createReview } from "../lib/reviews";
import WishlistButton from "../components/WishlistButton";
import PhotoLightbox from "../components/PhotoLightbox";

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
    description:
      "A comfortable and secure hostel located in the heart of Amamoma. Close to campus with reliable water and electricity supply.",
    images: [
      { id: "1", image_url: "https://i.imgur.com/luYRCIq.jpeg" },
      { id: "2", image_url: "https://i.imgur.com/peh4mP5.jpeg" },
      { id: "3", image_url: "https://i.imgur.com/CKdT7Di.jpeg" },
      { id: "4", image_url: "https://i.imgur.com/Ci2Vn7D.jpeg" },
    ],
    amenities: [
      { id: "1", name: "Free Wi-Fi" },
      { id: "2", name: "Water Flow" },
      { id: "3", name: "Security" },
      { id: "4", name: "Study Room" },
    ],
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
    description:
      "Premium accommodation for students who value privacy and comfort. Located in a serene environment at Ayensu.",
    images: [
      { id: "1", image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png" },
      { id: "2", image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration1-300x300.jpg" },
      { id: "3", image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1-300x300.png" },
    ],
    amenities: [
      { id: "1", name: "AC" },
      { id: "2", name: "Generator" },
      { id: "3", name: "Kitchen" },
      { id: "4", name: "DSTV" },
    ],
  },
};

function ReviewSection({
  hostelId,
  reviews,
  user,
  userProfile,
  isManual,
  onReviewAdded,
}: {
  hostelId: string;
  reviews: any[];
  user: any;
  userProfile: any;
  isManual: boolean;
  onReviewAdded: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const canReview = !!user && userProfile?.user_type === "student" && !isManual;
  const alreadyReviewed = reviews.some((r) => r.student_id === user?.id);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating === 0) return;

    setSubmitting(true);
    setReviewError("");

    try {
      await createReview({
        hostel_id: hostelId,
        student_id: user.id,
        rating,
        comment: comment.trim() || undefined,
        is_verified_guest: false,
      });
      setReviewSuccess(true);
      setShowForm(false);
      setRating(0);
      setComment("");
      onReviewAdded();
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch {
      setReviewError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reviews ({reviews.length})</h2>
        {canReview && !alreadyReviewed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 text-sm font-bold text-[#DC143C] hover:text-red-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Write a Review
          </button>
        )}
      </div>

      {reviewSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700 font-semibold text-sm">Review submitted!</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Your Review</h3>
          {reviewError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{reviewError}</p>
            </div>
          )}
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Share your experience..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DC143C]/30 focus:border-[#DC143C]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="bg-[#DC143C] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setReviewError(""); }}
                className="px-6 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-gray-900">{review.user_profiles?.full_name || "Anonymous"}</p>
                  <p className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && <p className="text-gray-700">{review.comment}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No reviews yet. Be the first to review!</p>
        </div>
      )}
    </div>
  );
}

interface HostelDetailPageProps {
  hostelId: string;
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
  wishlistIds: string[];
  onWishlistToggle: (hostelId: string, newState: boolean) => void;
  compareIds: string[];
  onCompareToggle: (hostelId: string) => void;
}

export default function HostelDetailPage({
  hostelId, user, userProfile, onNavigate,
  wishlistIds, onWishlistToggle, compareIds, onCompareToggle,
}: HostelDetailPageProps) {
  const [hostel, setHostel] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    void loadHostel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostelId]);

  const loadHostel = async () => {
    setLoading(true);
    try {
      // 1. Try fetching from API
      let data = await getHostelById(hostelId);

      // 2. Fallback to manual data if not found in API
      if (!data && MANUAL_HOSTELS[hostelId]) {
        // eslint-disable-next-line no-console
        console.log("Using manual fallback data for:", hostelId);
        data = MANUAL_HOSTELS[hostelId];
      }

      setHostel(data);

      // Only fetch reviews if we actually found a hostel (and it's not a manual one without reviews)
      if (data && !MANUAL_HOSTELS[hostelId]) {
        const reviewsData = await getHostelReviews(hostelId);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } else {
        setReviews([]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading hostel:", err);
      // Final fallback attempt in case of error
      if (MANUAL_HOSTELS[hostelId]) {
        setHostel(MANUAL_HOSTELS[hostelId]);
      } else {
        setHostel(null);
      }
      setReviews([]);
    } finally {
      setLoading(false);
      setImageIndex(0);
    }
  };

  // Availability (safe + honest)
  const bedsRaw = hostel?.beds_available;
  const bedsLeft = typeof bedsRaw === "number" && Number.isFinite(bedsRaw) ? bedsRaw : null;
  const scarcityText =
    bedsLeft == null ? "Check availability" : bedsLeft > 6 ? "6+ Rooms Left" : `${Math.max(0, bedsLeft)} Rooms Left`;

  const canBook = !!user && userProfile?.user_type === "student";

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading hostel details...</p>
        </div>
      </div>
    );
  }

  // 2. Not Found State
  if (!hostel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Hostel Not Found</h2>
          <p className="text-gray-600 mb-6">
            The hostel you are looking for might have been removed or does not exist.
          </p>
          <button
            onClick={() => onNavigate("search")}
            className="bg-[#DC143C] text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            type="button"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // 3. Success State
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile “safe space” for bottom CTA (only shows if canBook) */}
      <div className={canBook ? "pb-24 lg:pb-0" : ""}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button
            onClick={() => onNavigate("search")}
            className="flex items-center gap-2 text-[#DC143C] font-semibold mb-5 sm:mb-6 hover:text-red-700"
            type="button"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Search
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10 lg:mb-12">
            {/* LEFT COLUMN: IMAGES */}
            <div className="lg:col-span-2">
              <div
                className="relative bg-gray-200 rounded-xl overflow-hidden h-72 sm:h-96 mb-4 flex items-center justify-center shadow-sm cursor-pointer group"
                onClick={() => {
                  if (hostel.images?.length > 0) setLightboxOpen(true);
                }}
              >
                {hostel.images && hostel.images.length > 0 ? (
                  <img
                    src={hostel.images[imageIndex]?.image_url}
                    alt={`${hostel.name} - image ${imageIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">No Photo</div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  {hostel.verified && (
                    <div className="bg-[#DC143C] text-white px-4 py-2 rounded-full font-semibold shadow-md text-sm">
                      Verified
                    </div>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <WishlistButton
                    hostelId={hostelId}
                    userId={user?.id || null}
                    isWishlisted={wishlistIds.includes(hostelId)}
                    onToggle={onWishlistToggle}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompareToggle(hostelId);
                    }}
                    className={`p-2 rounded-full transition-all ${
                      compareIds.includes(hostelId)
                        ? "bg-sky-50 text-sky-600 shadow-sm"
                        : "bg-white/80 backdrop-blur-sm text-gray-400 hover:text-sky-600 hover:bg-sky-50"
                    }`}
                    title={compareIds.includes(hostelId) ? "Remove from compare" : "Add to compare"}
                  >
                    <GitCompareArrows className="w-5 h-5" />
                  </button>
                </div>

                {hostel.images?.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {imageIndex + 1} / {hostel.images.length}
                  </div>
                )}
              </div>

              {lightboxOpen && hostel.images?.length > 0 && (
                <PhotoLightbox
                  images={hostel.images.map((img: any) => img.image_url)}
                  initialIndex={imageIndex}
                  onClose={() => setLightboxOpen(false)}
                />
              )}

              {hostel.images && hostel.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {hostel.images.map((image: any, idx: number) => (
                    <button
                      key={image.id || idx}
                      onClick={() => setImageIndex(idx)}
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                        imageIndex === idx ? "border-[#DC143C] scale-105" : "border-transparent hover:border-gray-300"
                      }`}
                      type="button"
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img
                        src={image.image_url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: BOOKING CARD */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6 h-fit lg:sticky lg:top-24">
              {/* LIVE INDICATOR */}
              <div className="flex items-center gap-2 mb-4 bg-red-50 w-fit px-3 py-1.5 rounded-full border border-red-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC143C]" />
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

              {/* Desktop / card CTA (kept) */}
              {canBook ? (
                <button
                  onClick={() => onNavigate("booking", hostelId)}
                  className="group relative w-full bg-gradient-to-r from-[#DC143C] to-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden"
                  type="button"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
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
                  onClick={() => onNavigate("auth")}
                  className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  type="button"
                >
                  Sign In to Book
                </button>
              )}

              <div className="mt-8 space-y-4 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {hostel.location}
                    {hostel.city ? `, ${hostel.city}` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Users className="w-5 h-5 text-gray-400" />
                  <span className="capitalize font-medium">{hostel.room_type} rooms</span>
                </div>

                <div className="flex items-center gap-3 text-gray-700">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {bedsLeft == null ? "Availability: check with hostel" : `${Math.max(0, bedsLeft)} beds available`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-gray-900 text-lg">{hostel.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium hover:text-gray-700 underline cursor-pointer">
                    {hostel.review_count || 0} reviews
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: DETAILS & REVIEWS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              <div className="mb-10 lg:mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {hostel.description || "No description available for this hostel yet."}
                </p>
              </div>

              {hostel.amenities && hostel.amenities.length > 0 && (
                <div className="mb-10 lg:mb-12">
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

              <ReviewSection
                hostelId={hostelId}
                reviews={reviews}
                user={user}
                userProfile={userProfile}
                isManual={!!MANUAL_HOSTELS[hostelId]}
                onReviewAdded={async () => {
                  if (!MANUAL_HOSTELS[hostelId]) {
                    const r = await getHostelReviews(hostelId);
                    setReviews(Array.isArray(r) ? r : []);
                  }
                }}
              />
            </div>

            {/* Optional right column space on desktop (keeps layout balanced). No new UI added. */}
            <div className="hidden lg:block" />
          </div>
        </div>

        {/* MOBILE FIX: Sticky bottom booking CTA (only for students) */}
        {canBook && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-500">Price (approx)</div>
                <div className="text-lg font-extrabold text-gray-900 truncate">
                  <span className="text-[#DC143C]">₵{hostel.price_per_night}</span>{" "}
                  <span className="text-gray-400 text-sm font-bold">/ semester</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate("booking", hostelId)}
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#DC143C] to-red-600 text-white font-extrabold px-5 py-3 rounded-xl shadow-lg shadow-red-500/25 active:scale-[0.98] transition"
                type="button"
              >
                Book
                <Zap className="w-4 h-4 fill-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div> 
  );
}
