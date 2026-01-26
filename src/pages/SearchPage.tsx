import { useState, useEffect, useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, XCircle, SearchX, Image as ImageIcon } from "lucide-react";
import { getHostels } from "../lib/hostels";
import { PageType } from "../App";

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

// We use 'any' to easily handle the mix of API data and manual manual data
type Hostel = any;

// --- Helpers (Same as HomeFeatured) ---
function getStringField(obj: any, key: string) { return typeof obj?.[key] === 'string' ? obj[key] : undefined; }

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find(x => typeof x === 'string' && x);
  return found ? [found] : [];
}

// --- Mosaic Card Component (Same design as Featured) ---
function SearchMosaicCard({ hostel, onOpen }: { hostel: any; onOpen: () => void; }) {
  const name = getStringField(hostel, "name") || "Hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const images = getImageUrls(hostel);
  
  // Ensure we have at least 5 images for the full mosaic
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) {
      safeImages.push(safeImages[0]);
  }
  
  const [a, b, c, d, e] = safeImages;

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      
      {/* 1. MOSAIC GRID IMAGES */}
      <button 
        onClick={onOpen} 
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
            {/* Large Left Image */}
            <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">
                {a && <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Main" />}
            </div>

            {/* Top Right 1 */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
                {b && <img src={b} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 1" />}
            </div>

            {/* Top Right 2 */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
                {c && <img src={c} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 2" />}
            </div>

             {/* Bottom Right 1 */}
             <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
                {d && <img src={d} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 3" />}
            </div>

            {/* Bottom Right 2 */}
            <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
                {e && <img src={e} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 4" />}
            </div>
        </div>

        {/* Floating "See all photos" Button */}
        <div className="absolute bottom-4 right-4 z-10">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105">
                <ImageIcon className="h-4 w-4" />
                <span>See all photos</span>
            </div>
        </div>
      </button>

      {/* 2. DETAILS BELOW */}
      <div className="px-2 pb-2">
        <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">
            {name}
        </h3>
        {location && (
            <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                <MapPin className="h-4 w-4 text-slate-400" />
                {location}
            </div>
        )}
      </div>
    </div>
  );
}

// --- Main Page Component ---
export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // -- Filter States --
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getHostels();
        const list = Array.isArray(data) ? [...data] : [];

        // --- MANUALLY ADD FEATURED HOSTELS (Consistency with Home) ---
        const manualHostels = [
          {
            id: "nana-agyoma-manual",
            name: "Nana Agyoma Hostel",
            address: "Amamoma, UCC", 
            location: "Amamoma", 
            images: [
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
            ],
            main_image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop",
          },
          {
            id: "success-city-manual",
            name: "Success City Hostel",
            address: "Kwakyerkrom, UCC", 
            location: "Kwakyerkrom", 
            images: [
                "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1560067174-8943bd8f2662?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=1200&auto=format&fit=crop",
            ],
            main_image: "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=600&auto=format&fit=crop",
          }
        ];

        // Merge without duplicates
        const existingNames = new Set(list.map((h: any) => h.name?.toLowerCase()));
        manualHostels.forEach(m => { 
            if (!existingNames.has(m.name.toLowerCase())) {
                list.push(m);
            }
        });

        setHostels(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // -- Filtering Logic --
  const filteredHostels = useMemo(() => {
    return hostels.filter((hostel) => {
      const term = searchTerm.toLowerCase();
      const name = (hostel.name || "").toLowerCase();
      const addr = (hostel.address || "").toLowerCase();
      const loc = (hostel.location || "").toLowerCase();

      // 1. Search Term
      const matchesSearch = term === "" || name.includes(term) || addr.includes(term) || loc.includes(term);

      // 2. Location Dropdown
      const matchesLocation = locationFilter === "All" || 
        (hostel.address || "").includes(locationFilter) || 
        (hostel.location || "").includes(locationFilter);

      return matchesSearch && matchesLocation;
    });
  }, [hostels, searchTerm, locationFilter]);

  // Extract unique locations
  const uniqueLocations = useMemo(() => {
    const locs = new Set(hostels.map(h => h.location || h.address || "").filter(Boolean));
    const cleanLocs = Array.from(locs).map(l => l.split(',')[0].trim()).filter((v, i, a) => a.indexOf(v) === i);
    return ["All", ...cleanLocs];
  }, [hostels]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        
        {/* --- Header & Search Controls --- */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Search Hostels</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <div className="flex gap-2">
               <button 
                 onClick={() => setShowFilters(!showFilters)}
                 className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
               >
                 <SlidersHorizontal className="h-4 w-4" /> Filters
               </button>

               {/* Location Dropdown */}
               <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-4 w-full md:w-auto`}>
                 <div className="relative min-w-[200px]">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                        {uniqueLocations.map((loc, i) => (
                            <option key={i} value={loc}>{loc === "All" ? "Any Location" : loc}</option>
                        ))}
                    </select>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* --- Results Section --- */}
        <div>
          {loading ? (
            // Loading Skeletons - Matched size to new card format
            <div className="grid grid-cols-1 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[2rem] border-2 border-slate-200 bg-white p-4 animate-pulse">
                   <div className="h-80 w-full bg-slate-100 rounded-[1.5rem] mb-4"/>
                   <div className="h-6 w-1/3 bg-slate-100 rounded mb-2"/>
                   <div className="h-4 w-1/4 bg-slate-100 rounded"/>
                </div>
              ))}
            </div>
          ) : filteredHostels.length > 0 ? (
            // Results Grid - Single Column for Mosaic Cards
            <div className="grid grid-cols-1 gap-8">
              {filteredHostels.map((hostel) => (
                <SearchMosaicCard 
                  key={hostel.id} 
                  hostel={hostel} 
                  onOpen={() => onNavigate("detail", hostel.id)} 
                />
              ))}
            </div>
          ) : (
            // --- EMPTY STATE ---
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 border-2 border-slate-200">
                <SearchX className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">No hostels found</h3>
              <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                We couldn't find any matches for "{searchTerm}". <br/>
                Try adjusting your filters to find more options.
              </p>
              <button 
                onClick={() => { setSearchTerm(""); setLocationFilter("All"); }}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}