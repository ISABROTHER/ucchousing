import { useState, useEffect } from "react";
import { ArrowRight, Star, AlertTriangle, Image as ImageIcon, MapPin } from "lucide-react";
import { getFeaturedHostels } from "../../lib/hostels";
import { PageType } from "../../App";

// --- Helpers ---
function getStringField(obj: any, key: string) { return typeof obj?.[key] === 'string' ? obj[key] : undefined; }

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find(x => typeof x === 'string' && x);
  return found ? [found] : [];
}

// --- Modified Card Component with Interactive Gallery ---
function FeaturedPhotoMosaicCard({ hostel, onOpen }: { hostel: any; onOpen: () => void; }) {
  const name = getStringField(hostel, "name") || "Featured hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const images = getImageUrls(hostel);
  
  // Ensure we have at least 4 images for the layout (1 Main + 3 Thumbnails)
  const safeImages = [...images];
  while (safeImages.length < 4 && safeImages.length > 0) {
      safeImages.push(safeImages[safeImages.length % safeImages.length]);
  }
  
  // State: Which image is currently displayed in the main hero slot?
  // Default to the first image in the list.
  const [activeMain, setActiveMain] = useState(safeImages[0]);

  // Update state if the hostel data changes (e.g. recycling components)
  useEffect(() => {
    if (safeImages[0]) setActiveMain(safeImages[0]);
  }, [hostel.id]);

  // The 3 thumbnails below the main image
  const thumbnails = safeImages.slice(1, 4);

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 w-full max-w-full">
      
      {/* 1. INTERACTIVE GALLERY */}
      <div className="flex flex-col gap-2 w-full">
          
          {/* TOP: Main Hero Image (Clicking this opens the details page) */}
          <button 
            onClick={onOpen}
            className="w-full h-64 sm:h-72 relative overflow-hidden bg-slate-200 rounded-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-500/20 group/image"
          >
              {activeMain && (
                <img 
                  src={activeMain} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105" 
                  alt="Main View" 
                />
              )}
              
              {/* Floating "See photos" Badge */}
              <div className="absolute bottom-4 right-4 z-10 max-w-[80%]">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm border border-white/50 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105 whitespace-nowrap">
                      <ImageIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">See photos</span>
                  </div>
              </div>
          </button>

          {/* BOTTOM: 3 Clickable Thumbnails (Clicking these changes the Main Image) */}
          <div className="grid grid-cols-3 gap-2 h-24 sm:h-32">
              {thumbnails.map((thumb, idx) => (
                <button
                  key={`${hostel.id}-thumb-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Don't trigger the parent click
                    setActiveMain(thumb); // Update the main image
                  }}
                  className={`relative overflow-hidden bg-slate-200 rounded-lg cursor-pointer transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activeMain === thumb ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                >
                  <img 
                    src={thumb} 
                    className="h-full w-full object-cover" 
                    alt={`View ${idx + 1}`} 
                  />
                </button>
              ))}
          </div>
      </div>

      {/* 2. DETAILS BELOW (Title & Location) - Clicking opens details */}
      <button 
        onClick={onOpen}
        className="px-2 pb-2 min-w-0 text-left focus:outline-none"
      >
        <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors break-words">
            {name}
        </h3>
        {location && (
            <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium min-w-0">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{location}</span>
            </div>
        )}
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

      // Manual data injection
      const manualHostels = [
        {
          id: "nana-agyoma-manual",
          name: "Nana Agyoma Hostel",
          address: "Amamoma, UCC", location: "Amamoma",
          // Prioritize the user's specific image order
          main_image: "https://i.imgur.com/luYRCIq.jpeg",
          images: [
            "https://i.imgur.com/luYRCIq.jpeg", // 1. Main (Big Top)
            "https://i.imgur.com/peh4mP5.jpeg", // 2. Bottom Left
            "https://i.imgur.com/CKdT7Di.jpeg", // 3. Bottom Center
            "https://i.imgur.com/Ci2Vn7D.jpeg", // 4. Bottom Right
          ],
        },
        {
          id: "success-city-manual",
          name: "Success City Hostel",
          address: "Kwakyerkrom, UCC", location: "Kwakyerkrom",
          main_image: "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1560067174-8943bd8f2662?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=1200&auto=format&fit=crop",
          ],
        }
      ];

      const existing = new Set(list.map((h: any) => h.name?.toLowerCase()));
      manualHostels.forEach(m => { if (!existing.has(m.name.toLowerCase())) list.push(m); });
      
      setFeatured(list);
    } catch { setError("We could not load featured hostels right now."); } finally { setLoading(false); }
  };

  useEffect(() => { void loadFeatured(); }, []);

  return (
    <div className="mt-16 mx-auto max-w-5xl px-4 w-full">
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
        <div className="grid grid-cols-1 gap-8">
           {[1,2].map(i => (
             <div key={i} className="animate-pulse rounded-[2rem] border-2 border-slate-100 bg-white p-4">
                <div className="h-80 w-full bg-slate-200 rounded-[1.5rem] mb-4"></div>
                <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
             </div>
           ))}
        </div>
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 w-full">
          {featured.map((hostel) => (
            <FeaturedPhotoMosaicCard key={hostel.id} hostel={hostel} onOpen={() => onNavigate("detail", hostel.id)} />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-bold text-slate-900">No featured hostels yet</p>
          <button onClick={() => void loadFeatured()} className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition">Refresh</button>
        </div>
      )}
    </div>
  );
}