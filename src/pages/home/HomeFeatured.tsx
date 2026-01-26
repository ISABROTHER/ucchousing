import { useState, useEffect } from "react";
import { ArrowRight, Star, AlertTriangle, Image as ImageIcon, MapPin, Tag } from "lucide-react";
import { getFeaturedHostels } from "../../lib/hostels";
import { PageType } from "../../App";

// --- Helpers ---
function getStringField(obj: any, key: string) { return typeof obj?.[key] === 'string' ? obj[key] : undefined; }
function getNumberField(obj: any, key: string) { return typeof obj?.[key] === 'number' ? obj[key] : undefined; }
function getStringArrayField(obj: any, key: string): string[] | undefined {
  if (Array.isArray(obj?.[key])) return obj[key].filter((x: any) => typeof x === 'string');
  return undefined;
}

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find(x => typeof x === 'string' && x);
  return found ? [found] : [];
}

function getNearbyChips(hostel: any): string[] {
  const arr = getStringArrayField(hostel, "nearby");
  if (arr && arr.length > 0) return arr.slice(0, 4);
  return ["Bus stop", "Grocery store", "Student gym", "Nature and leisure"];
}

function formatPrice(price: any) {
    if (typeof price !== 'number') return null;
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', maximumFractionDigits: 0 }).format(price);
}

// --- Strict Reference Card Component ---
function FeaturedPhotoMosaicCard({ hostel, onOpen }: { hostel: any; onOpen: () => void; }) {
  const name = getStringField(hostel, "name") || "Featured hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const rating = getNumberField(hostel, "rating");
  const price = getNumberField(hostel, "price");
  const reviewCount = getNumberField(hostel, "reviews_count");
  const images = getImageUrls(hostel);
  
  // Ensure we have at least 5 images for the full mosaic, or repeat the last one
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) {
      safeImages.push(safeImages[0]);
  }
  
  const [a, b, c, d, e] = safeImages;
  const nearby = getNearbyChips(hostel);

  return (
    <div className="group/card flex flex-col gap-3 mb-10">
      
      {/* 1. TOP TAGS (Strictly matching reference IMG_0549) */}
      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 truncate">
        {nearby.map((tag, i) => (
            <span key={i}>
                {tag}
                {i < nearby.length - 1 && <span className="mx-2 text-slate-400">•</span>}
            </span>
        ))}
      </div>

      {/* 2. MOSAIC GRID IMAGES */}
      <button 
        onClick={onOpen} 
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
            {/* Large Left Image (Cols 1-2, Rows 1-2) */}
            <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-100">
                {a && <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Main" />}
            </div>

            {/* Top Right 1 (Col 3, Row 1) */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-100">
                {b && <img src={b} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 1" />}
            </div>

            {/* Top Right 2 (Col 4, Row 1) */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-100">
                {c && <img src={c} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 2" />}
            </div>

             {/* Bottom Right 1 (Col 3, Row 2) */}
             <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-100">
                {d && <img src={d} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 3" />}
            </div>

            {/* Bottom Right 2 (Col 4, Row 2) */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-100">
                {e && <img src={e} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 4" />}
            </div>
        </div>

        {/* Floating "See all photos" Button (Bottom Right Overlay) */}
        <div className="absolute bottom-4 right-4 z-10">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105">
                <ImageIcon className="h-4 w-4" />
                <span>See all photos</span>
            </div>
        </div>
      </button>

      {/* 3. DETAILS BELOW (Title, Price, Rating) */}
      <div className="flex items-start justify-between gap-4 px-1">
        <div>
            <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">
                {name}
            </h3>
            {location && (
                <div className="mt-1 flex items-center gap-1 text-slate-500 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                </div>
            )}
        </div>
        
        <div className="text-right">
             {price && (
                <div className="text-lg font-extrabold text-slate-900">
                    {formatPrice(price)}
                </div>
            )}
            {typeof rating === "number" && (
              <div className="flex items-center justify-end gap-1 text-sm font-bold text-slate-700 mt-0.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>{rating}</span>
                {typeof reviewCount === "number" && (
                    <span className="text-slate-400 font-medium">({reviewCount})</span>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---
interface HomeFeaturedProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomeFeatured({ onNavigate }: HomeFeaturedProps) {
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeatured = async () => {
    setLoading(true); setError("");
    try {
      const data = await getFeaturedHostels(6);
      const list = Array.isArray(data) ? [...data] : [];

      // Manual data injection
      const manualHostels = [
        {
          id: "nana-agyoma-manual",
          name: "Nana Agyoma Hostel",
          price: 3200, address: "Amamoma, UCC", location: "Amamoma", rating: 4.8, reviews_count: 42,
          main_image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
          ],
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature and leisure"],
        },
        {
          id: "success-city-manual",
          name: "Success City Hostel",
          price: 4500, address: "Kwakyerkrom, UCC", location: "Kwakyerkrom", rating: 4.6, reviews_count: 28,
          main_image: "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1560067174-8943bd8f2662?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=1200&auto=format&fit=crop",
          ],
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature and leisure"],
        }
      ];

      const existing = new Set(list.map((h: any) => h.name?.toLowerCase()));
      manualHostels.forEach(m => { if (!existing.has(m.name.toLowerCase())) list.push(m); });
      
      setFeatured(list);
    } catch { setError("We could not load featured hostels right now."); } finally { setLoading(false); }
  };

  useEffect(() => { void loadFeatured(); }, []);

  return (
    <div className="mt-16 mx-auto max-w-5xl px-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Featured hostels</h2>
          <p className="text-slate-500 mt-2 font-medium">Curated picks for the best student living experience.</p>
        </div>
        
        <button 
          onClick={() => onNavigate("search")} 
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
        >
          View all listings <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-base font-bold text-rose-900">{error}</p>
            <button onClick={() => void loadFeatured()} className="mt-4 inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition shadow-sm">Try again</button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-12">
           {[1,2].map(i => (
             <div key={i} className="animate-pulse">
                <div className="h-4 w-2/3 bg-slate-200 rounded mb-3"></div>
                <div className="h-80 w-full bg-slate-200 rounded-[1.5rem] mb-4"></div>
                <div className="flex justify-between">
                    <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
                    <div className="h-6 w-1/6 bg-slate-200 rounded"></div>
                </div>
             </div>
           ))}
        </div>
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-1 gap-12">
          {featured.map((hostel) => (
            <FeaturedPhotoMosaicCard key={hostel.id} hostel={hostel} onOpen={() => onNavigate("detail", hostel.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-900">No featured hostels yet</p>
          <button onClick={() => void loadFeatured()} className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition">Refresh</button>
        </div>
      )}
    </div>
  );
}