import { useEffect, useState } from "react";
import { GitCompareArrows, X, Star, MapPin, Wifi, Shield, Zap, ChevronLeft, CheckCircle2, XCircle, Plus } from "lucide-react";
import { PageType } from "../App";
import { getHostelById } from "../lib/hostels";
import { removeFromCompare, clearCompare } from "../lib/compare";

interface ComparePageProps {
  compareIds: string[];
  onCompareChange: (ids: string[]) => void;
  onNavigate: (page: PageType, hostelId?: string) => void;
}

interface HostelData {
  id: string;
  name: string;
  location: string;
  price_per_night: number;
  rating: number;
  review_count: number;
  beds_available: number;
  room_type: string;
  description: string;
  verified: boolean;
  images: { image_url: string }[];
  amenities: { name: string; icon?: string }[];
}

const ALL_AMENITY_KEYS = [
  "WiFi", "Parking", "Air Conditioning", "Hot Water", "Kitchen Access",
  "Laundry", "Common Area", "Quiet Hours", "24/7 Reception", "Gym",
];

function getAmenityIcon(name: string) {
  if (name.toLowerCase().includes("wifi")) return Wifi;
  if (name.toLowerCase().includes("security") || name.toLowerCase().includes("reception")) return Shield;
  if (name.toLowerCase().includes("generator") || name.toLowerCase().includes("backup")) return Zap;
  return CheckCircle2;
}

export default function ComparePage({ compareIds, onCompareChange, onNavigate }: ComparePageProps) {
  const [hostels, setHostels] = useState<(HostelData | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.all(
          compareIds.map(async (id) => {
            try {
              const data = await getHostelById(id);
              return data as HostelData | null;
            } catch {
              return null;
            }
          })
        );
        setHostels(results);
      } finally {
        setLoading(false);
      }
    };
    if (compareIds.length > 0) {
      load();
    } else {
      setLoading(false);
    }
  }, [compareIds]);

  const handleRemove = (id: string) => {
    const updated = removeFromCompare(id);
    onCompareChange(updated);
  };

  const handleClear = () => {
    clearCompare();
    onCompareChange([]);
  };

  const validHostels = hostels.filter(Boolean) as HostelData[];
  const allAmenityNames = new Set<string>();
  validHostels.forEach((h) =>
    h.amenities?.forEach((a) => allAmenityNames.add(a.name))
  );
  const amenityList = ALL_AMENITY_KEYS.filter((k) => allAmenityNames.has(k));
  const extraAmenities = [...allAmenityNames].filter((a) => !ALL_AMENITY_KEYS.includes(a));
  const finalAmenityList = [...amenityList, ...extraAmenities];

  const bestPrice = validHostels.length > 0
    ? Math.min(...validHostels.map((h) => h.price_per_night || Infinity))
    : null;
  const bestRating = validHostels.length > 0
    ? Math.max(...validHostels.map((h) => h.rating || 0))
    : null;
  const bestAvailability = validHostels.length > 0
    ? Math.max(...validHostels.map((h) => h.beds_available || 0))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-sky-500 rounded-full animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (compareIds.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <GitCompareArrows className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Hostels to Compare</h2>
          <p className="text-gray-600 mb-6">
            Add hostels to your compare list from the search page, then come back here to see them side by side.
          </p>
          <button
            onClick={() => onNavigate("search")}
            className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Browse Hostels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => onNavigate("search")}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold">Back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <GitCompareArrows className="w-7 h-7 text-sky-500" />
              Compare Hostels
            </h1>
            <p className="text-gray-500 text-sm mt-1">{validHostels.length} of 3 slots used</p>
          </div>
          <button
            onClick={handleClear}
            className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `180px repeat(${validHostels.length}, 1fr)${validHostels.length < 3 ? " 1fr" : ""}` }}>

              <div />
              {validHostels.map((h) => (
                <div key={h.id} className="relative">
                  <button
                    onClick={() => handleRemove(h.id)}
                    className="absolute -top-2 -right-2 z-10 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="h-40 bg-gray-200 relative">
                      {h.images?.[0]?.image_url ? (
                        <img src={h.images[0].image_url} alt={h.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Photo</div>
                      )}
                      {h.verified && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <button
                        onClick={() => onNavigate("detail", h.id)}
                        className="text-left font-bold text-gray-900 hover:text-sky-600 transition-colors text-sm leading-tight"
                      >
                        {h.name}
                      </button>
                      <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{h.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {validHostels.length < 3 && (
                <button
                  onClick={() => onNavigate("search")}
                  className="flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 min-h-[260px] hover:border-sky-300 hover:bg-sky-50/30 transition-colors group"
                >
                  <Plus className="w-8 h-8 text-gray-300 group-hover:text-sky-400 transition-colors" />
                  <span className="text-sm font-semibold text-gray-400 group-hover:text-sky-500 mt-2">Add Hostel</span>
                </button>
              )}

              <CompareRow label="Price / Semester" highlight>
                {validHostels.map((h) => (
                  <div key={h.id} className="text-center">
                    <span className={`text-lg font-bold ${h.price_per_night === bestPrice ? "text-emerald-600" : "text-gray-900"}`}>
                      GHS {h.price_per_night?.toLocaleString() || "--"}
                    </span>
                    {h.price_per_night === bestPrice && validHostels.length > 1 && (
                      <span className="block text-[10px] font-bold text-emerald-500 mt-0.5">BEST PRICE</span>
                    )}
                  </div>
                ))}
                {validHostels.length < 3 && <div />}
              </CompareRow>

              <CompareRow label="Rating">
                {validHostels.map((h) => (
                  <div key={h.id} className="flex items-center justify-center gap-1">
                    <Star className={`w-4 h-4 ${h.rating === bestRating && validHostels.length > 1 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                    <span className={`font-bold ${h.rating === bestRating && validHostels.length > 1 ? "text-yellow-600" : "text-gray-900"}`}>
                      {h.rating?.toFixed(1) || "--"}
                    </span>
                    <span className="text-xs text-gray-400">({h.review_count || 0})</span>
                  </div>
                ))}
                {validHostels.length < 3 && <div />}
              </CompareRow>

              <CompareRow label="Availability" highlight>
                {validHostels.map((h) => (
                  <div key={h.id} className="text-center">
                    <span className={`font-bold ${
                      h.beds_available === 0
                        ? "text-red-500"
                        : h.beds_available === bestAvailability && validHostels.length > 1
                          ? "text-emerald-600"
                          : "text-gray-900"
                    }`}>
                      {h.beds_available != null ? `${h.beds_available} rooms` : "--"}
                    </span>
                  </div>
                ))}
                {validHostels.length < 3 && <div />}
              </CompareRow>

              <CompareRow label="Room Type">
                {validHostels.map((h) => (
                  <div key={h.id} className="text-center text-sm font-medium text-gray-700 capitalize">
                    {h.room_type || "--"}
                  </div>
                ))}
                {validHostels.length < 3 && <div />}
              </CompareRow>

              {finalAmenityList.length > 0 && (
                <div className="col-span-full mt-4 mb-2">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Amenities</h3>
                </div>
              )}

              {finalAmenityList.map((amenity, idx) => {
                const Icon = getAmenityIcon(amenity);
                return (
                  <CompareRow key={amenity} label={amenity} highlight={idx % 2 === 0} icon={<Icon className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />}>
                    {validHostels.map((h) => {
                      const has = h.amenities?.some((a) => a.name === amenity);
                      return (
                        <div key={h.id} className="flex justify-center">
                          {has ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-200" />
                          )}
                        </div>
                      );
                    })}
                    {validHostels.length < 3 && <div />}
                  </CompareRow>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  children,
  highlight,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  const validChildren = Array.isArray(children) ? children : [children];
  const count = validChildren.length;

  return (
    <div
      className={`grid items-center gap-4 px-4 py-3 rounded-xl ${highlight ? "bg-gray-50" : ""}`}
      style={{ gridTemplateColumns: `180px repeat(${count}, 1fr)` }}
    >
      <div className="flex items-center text-sm font-semibold text-gray-600">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
