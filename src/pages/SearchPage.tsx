import { useState, useEffect, useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, XCircle, SearchX } from "lucide-react";
import { getHostels } from "../lib/hostels";
import HostelCard from "../components/HostelCard";
import { PageType } from "../App";

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

// We use 'any' here temporarily to allow merging manual data with API data easily
type Hostel = any; 

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

        // --- MANUALLY ADD FEATURED HOSTELS ---
        // This ensures the Search Page shows the same data as the Home Page
        const manualHostels = [
          {
            id: "nana-agyoma-manual",
            name: "Nana Agyoma Hostel",
            price: 3200, 
            address: "Amamoma, UCC", 
            location: "Amamoma", 
            rating: 4.8, 
            reviews_count: 42,
            images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop"],
            main_image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=600&auto=format&fit=crop",
            amenities: ["Wifi", "Water", "Security"]
          },
          {
            id: "success-city-manual",
            name: "Success City Hostel",
            price: 4500, 
            address: "Kwakyerkrom, UCC", 
            location: "Kwakyerkrom", 
            rating: 4.6, 
            reviews_count: 28,
            images: ["https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=600&auto=format&fit=crop"],
            main_image: "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=600&auto=format&fit=crop",
            amenities: ["AC", "Study Room", "Generator"]
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

      // 1. Search Term (matches name, address, or location field)
      const matchesSearch = term === "" || name.includes(term) || addr.includes(term) || loc.includes(term);

      // 2. Location Dropdown
      // We check both 'address' and 'location' fields to be safe
      const matchesLocation = locationFilter === "All" || 
        (hostel.address || "").includes(locationFilter) || 
        (hostel.location || "").includes(locationFilter);

      return matchesSearch && matchesLocation;
    });
  }, [hostels, searchTerm, locationFilter]);

  // Extract unique locations for the dropdown
  const uniqueLocations = useMemo(() => {
    const locs = new Set(hostels.map(h => h.location || h.address || "").filter(Boolean));
    // Clean up locations (simple dedupe)
    const cleanLocs = Array.from(locs).map(l => l.split(',')[0].trim()).filter((v, i, a) => a.indexOf(v) === i);
    return ["All", ...cleanLocs];
  }, [hostels]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-6xl">
        
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

            {/* Filter Toggle (Mobile) / Container (Desktop) */}
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-[2rem] bg-white border border-slate-200 p-4 animate-pulse">
                   <div className="h-48 bg-slate-100 rounded-[1.5rem] mb-4"/>
                   <div className="h-6 w-3/4 bg-slate-100 rounded mb-2"/>
                   <div className="h-4 w-1/2 bg-slate-100 rounded"/>
                </div>
              ))}
            </div>
          ) : filteredHostels.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHostels.map((hostel) => (
                <div key={hostel.id} className="transition-transform hover:-translate-y-1 duration-300">
                    <HostelCard 
                    hostel={hostel} 
                    onClick={() => onNavigate("detail", hostel.id)} 
                    />
                </div>
              ))}
            </div>
          ) : (
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