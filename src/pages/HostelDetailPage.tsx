import { useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  MapPin,
  Users,
  Wifi,
  Clock,
  AlertCircle,
  ChevronLeft,
  Zap,
  CheckCircle,
  BedDouble,
} from "lucide-react";
import { PageType } from "../App";
import { getHostelById } from "../lib/hostels";
import { getHostelReviews } from "../lib/reviews";

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

interface HostelDetailPageProps {
  hostelId: string;
  user: any;
  userProfile: any;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type SectionKey = "about" | "amenities" | "reviews";

function safeNumber(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
    if (m) {
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function scarcityLabel(bedsLeft: number | null): { tone: "ok" | "low" | "full" | "unknown"; text: string } {
  if (bedsLeft == null) return { tone: "unknown", text: "Check availability" };
  const n = Math.max(0, bedsLeft);
  if (n === 0) return { tone: "full", text: "Full" };
  if (n <= 2) return { tone: "low", text: "1–2 Rooms Left" };
  if (n <= 5) return { tone: "low", text: "3–5 Rooms Left" };
  return { tone: "ok", text: "6+ Rooms Left" };
}

export default function HostelDetailPage({ hostelId, user, userProfile, onNavigate }: HostelDetailPageProps) {
  const [hostel, setHostel] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  // lightweight swipe for gallery (no new libs)
  const touchStartXRef = useRef<number | null>(null);

  // section refs for mobile quick nav
  const aboutRef = useRef<HTMLDivElement | null>(null);
  const amenitiesRef = useRef<HTMLDivElement | null>(null);
  const reviewsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadHostel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostelId]);

  const loadHostel = async () => {
    setLoading(true);
    try {
      let data = await getHostelById(hostelId);

      if (!data && MANUAL_HOSTELS[hostelId]) {
        // eslint-disable-next-line no-console
        console.log("Using manual fallback data for:", hostelId);
        data = MANUAL_HOSTELS[hostelId];
      }

      setHostel(data);

      if (data && !MANUAL_HOSTELS[hostelId]) {
        const reviewsData = await getHostelReviews(hostelId);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } else {
        setReviews([]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading hostel:", err);
      if (MANUAL_HOSTELS[hostelId]) setHostel(MANUAL_HOSTELS[hostelId]);
      else setHostel(null);
      setReviews([]);
    } finally {
      setLoading(false);
      setImageIndex(0);
    }
  };

  const canBook = !!user && userProfile?.user_type === "student";

  const bedsLeft = useMemo(() => safeNumber(hostel?.beds_available), [hostel]);
  const scarcity = useMemo(() => scarcityLabel(bedsLeft), [bedsLeft]);

  const hostelName = String(hostel?.name || "Hostel");
  const locationLine = `${hostel?.location || ""}${hostel?.city ? `, ${hostel.city}` : ""}`.trim();

  const images: Array<{ id?: string; image_url?: string }> = Array.isArray(hostel?.images) ? hostel.images : [];
  const activeImageUrl = images?.[imageIndex]?.image_url || "";

  const priceText = hostel?.price_per_night != null ? `₵${String(hostel.price_per_night)}` : "₵—";

  const scrollTo = (key: SectionKey) => {
    const el =
      key === "about" ? aboutRef.current : key === "amenities" ? amenitiesRef.current : reviewsRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX == null || endX == null) return;

    const dx = endX - startX;
    if (Math.abs(dx) < 40) return; // small movement ignore

    if (!images || images.length <= 1) return;

    if (dx < 0) {
      // swipe left next
      setImageIndex((p) => (p + 1) % images.length);
    } else {
      // swipe right prev
      setImageIndex((p) => (p - 1 + images.length) % images.length);
    }
  };

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
          <p className="text-gray-600 mb-6">The hostel you are looking for might have been removed or does not exist.</p>
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
      {/* Reserve space for mobile sticky CTA */}
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

          {/* MODERN MOBILE HERO: image + overlays + compact header */}
          <div className="lg:hidden mb-5">
            <div
              className="relative rounded-2xl overflow-hidden bg-gray-200 shadow-sm"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div className="h-72 w-full">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt={`${hostelName} cover`} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🏠</div>
                )}
              </div>

              {/* gradient for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

              {/* top badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {hostel.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-extrabold text-gray-900 shadow">
                    <CheckCircle className="h-4 w-4 text-[#DC143C]" />
                    Verified
                  </span>
                )}
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold shadow border",
                    scarcity.tone === "full"
                      ? "bg-white/95 text-[#DC143C] border-red-100"
                      : scarcity.tone === "low"
                        ? "bg-white/95 text-[#DC143C] border-red-100"
                        : scarcity.tone === "unknown"
                          ? "bg-white/95 text-gray-900 border-gray-200"
                          : "bg-white/95 text-[#DC143C] border-red-100",
                  ].join(" ")}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC143C]" />
                  </span>
                  Live • {scarcity.text}
                </span>
              </div>

              {/* bottom title */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="text-white">
                  <div className="text-2xl font-black leading-tight drop-shadow">{hostelName}</div>
                  {locationLine ? (
                    <div className="mt-1 inline-flex items-center gap-2 text-white/90 text-sm font-semibold">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{locationLine}</span>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <div className="text-white font-extrabold">
                        {hostel.rating?.toFixed(1) || "N/A"}
                        <span className="text-white/80 text-sm font-bold"> • {hostel.review_count || 0} reviews</span>
                      </div>
                    </div>

                    <div className="text-white text-right">
                      <div className="text-xs font-extrabold text-white/80">From</div>
                      <div className="text-xl font-black">
                        <span className="text-white">{priceText}</span>
                      </div>
                    </div>
                  </div>

                  {/* swipe dots */}
                  {images.length > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                      {images.slice(0, 8).map((img, idx) => (
                        <button
                          key={img.id || idx}
                          onClick={() => setImageIndex(idx)}
                          type="button"
                          aria-label={`Go to image ${idx + 1}`}
                          className={[
                            "h-2 w-2 rounded-full transition-all",
                            idx === imageIndex ? "bg-white" : "bg-white/45 hover:bg-white/70",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile quick section nav (modern + useful) */}
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => scrollTo("about")}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-900 shadow-sm hover:border-[#DC143C]/30"
              >
                About
              </button>
              {Array.isArray(hostel.amenities) && hostel.amenities.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollTo("amenities")}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-900 shadow-sm hover:border-[#DC143C]/30"
                >
                  Amenities
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollTo("reviews")}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-900 shadow-sm hover:border-[#DC143C]/30"
              >
                Reviews
              </button>
              <span className="shrink-0 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-extrabold text-gray-900 shadow-sm">
                <BedDouble className="h-4 w-4 text-[#DC143C]" />
                {bedsLeft == null ? "Ask rooms" : `${Math.max(0, bedsLeft)} beds`}
              </span>
            </div>
          </div>

          {/* Desktop layout stays similar (no breaking) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10 lg:mb-12">
            {/* LEFT COLUMN: IMAGES (desktop) */}
            <div className="lg:col-span-2 hidden lg:block">
              <div className="relative bg-gray-200 rounded-2xl overflow-hidden h-96 mb-4 flex items-center justify-center shadow-sm">
                {images.length > 0 ? (
                  <img
                    src={images[imageIndex]?.image_url}
                    alt={`${hostelName} - image ${imageIndex + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-gray-400 text-4xl">🏠</div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {hostel.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-gray-900 shadow-md">
                      <CheckCircle className="h-4 w-4 text-[#DC143C]" />
                      Verified
                    </span>
                  )}
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#DC143C] shadow-md border border-red-100">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DC143C]" />
                    </span>
                    Live • {scarcity.text}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="text-white">
                    <div className="text-3xl font-black drop-shadow">{hostelName}</div>
                    {locationLine ? (
                      <div className="mt-1 inline-flex items-center gap-2 text-white/90 text-sm font-semibold">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{locationLine}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((image: any, idx: number) => (
                    <button
                      key={image.id || idx}
                      onClick={() => setImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                        imageIndex === idx ? "border-[#DC143C] scale-105" : "border-transparent hover:border-gray-300"
                      }`}
                      type="button"
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={image.image_url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: BOOKING CARD (desktop) */}
            <div className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-100 p-6 h-fit sticky top-24">
              <div className="mb-6">
                <div className="text-4xl font-extrabold text-gray-900 mb-1 flex items-baseline gap-1">
                  <span className="text-[#DC143C]">{priceText}</span>
                </div>
                <p className="text-gray-500 text-sm font-medium">per semester (approx)</p>
              </div>

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
                  <span className="font-medium">{locationLine || "Location unavailable"}</span>
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
                  <span className="text-sm text-gray-500 font-medium">{hostel.review_count || 0} reviews</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              <div ref={aboutRef} className="mb-10 lg:mb-12 scroll-mt-28">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {hostel.description || "No description available for this hostel yet."}
                </p>
              </div>

              {Array.isArray(hostel.amenities) && hostel.amenities.length > 0 && (
                <div ref={amenitiesRef} className="mb-10 lg:mb-12 scroll-mt-28">
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

              <div ref={reviewsRef} className="scroll-mt-28">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews ({reviews.length})</h2>

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
            </div>

            <div className="hidden lg:block" />
          </div>
        </div>

        {/* MOBILE: Sticky bottom booking CTA (students only) */}
        {canBook && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-500">Price (approx)</div>
                <div className="text-lg font-extrabold text-gray-900 truncate">
                  <span className="text-[#DC143C]">{priceText}</span>{" "}
                  <span className="text-gray-400 text-sm font-bold">/ semester</span>
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-gray-500">
                  {scarcity.tone === "full" ? "Full right now" : scarcity.text}
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
