import { useState, useEffect } from "react";
import { ArrowRight, Star, AlertTriangle, Image as ImageIcon } from "lucide-react";
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
  return ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"];
}

// --- Mosaic Card ---
function FeaturedPhotoMosaicCard({ hostel, onOpen }: { hostel: any; onOpen: () => void; }) {
  const name = getStringField(hostel, "name") || "Featured hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const rating = getNumberField(hostel, "rating");
  const reviewCount = getNumberField(hostel, "reviews_count");
  const images = getImageUrls(hostel);
  const [a, b, c, d, e] = images;
  const nearby = getNearbyChips(hostel);
  const hasGallery = Boolean(a && b);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button onClick={onOpen} className="w-full text-left focus:outline-none">
            <h3 className="truncate text-lg font-extrabold leading-[1.2] text-slate-900 sm:text-xl">{name}</h3>
          </button>
          {location && <p className="mt-1 truncate text-sm font-semibold leading-[1.5] text-slate-600">{location}</p>}
          <p className="mt-3 text-sm font-semibold leading-[1.5] text-slate-600">{nearby.join(" • ")}</p>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          {typeof rating === "number" && (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-900">
              <Star className="h-4 w-4 text-amber-600" />
              <span>{rating.toFixed(1)}</span>
              {typeof reviewCount === "number" && <span className="font-semibold text-slate-500">({reviewCount})</span>}
            </div>
          )}
          <button onClick={onOpen} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50">
            Open <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button onClick={onOpen} className="group relative mt-4 block w-full overflow-hidden rounded-2xl bg-slate-100">
        <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-2 p-2">
          <div className="col-span-2 row-span-2 overflow-hidden rounded-xl bg-slate-200">
            {a && <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />}
          </div>
          {[b, c, d, e].map((img, i) => (
            <div key={i} className="col-span-1 row-span-1 overflow-hidden rounded-xl bg-slate-200">
              {img && <img src={img} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" loading="lazy" />}
            </div>
          ))}
        </div>
        
        {/* Mobile View */}
        <div className="grid sm:hidden grid-cols-2 gap-2 p-2">
           <div className="col-span-2 overflow-hidden rounded-xl bg-slate-200 aspect-[16/9]">
             {a && <img src={a} className="h-full w-full object-cover" loading="lazy" />}
           </div>
           <div className="overflow-hidden rounded-xl bg-slate-200 aspect-[4/3]">
             {b && <img src={b} className="h-full w-full object-cover" loading="lazy" />}
           </div>
           <div className="relative overflow-hidden rounded-xl bg-slate-200 aspect-[4/3]">
             {(c??a) && <img src={c??a} className="h-full w-full object-cover" loading="lazy" />}
             <div className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm backdrop-blur">
                <ImageIcon className="h-4 w-4" /> See all photos
             </div>
           </div>
        </div>
        {!hasGallery && <div className="absolute inset-0 flex items-center justify-center p-6"><div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-extrabold text-slate-900 shadow-sm backdrop-blur">Add photos to preview gallery</div></div>}
      </button>
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
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"],
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
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"],
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
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-600" />
          <h2 className="text-xl font-extrabold tracking-tight leading-[1.2] text-slate-900 sm:text-2xl">Featured hostels</h2>
        </div>
        <button onClick={() => onNavigate("search")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50">
          View all <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" />
          <div>
            <p className="text-sm font-extrabold text-rose-900">{error}</p>
            <button onClick={() => void loadFeatured()} className="mt-3 inline-flex items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-extrabold text-white">Try again</button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-5">
           {[1,2].map(i => (
             <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="h-5 w-2/3 animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
                <div className="mt-4 aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-100" />
             </div>
           ))}
        </div>
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-1 gap-5">
          {featured.map((hostel) => (
            <FeaturedPhotoMosaicCard key={hostel.id} hostel={hostel} onOpen={() => onNavigate("detail", hostel.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-extrabold text-slate-900">No featured hostels yet</p>
          <button onClick={() => void loadFeatured()} className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm">Refresh</button>
        </div>
      )}
    </div>
  );
}