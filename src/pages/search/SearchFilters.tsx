import { ReactNode } from "react";
import { X, Check, Filter, MapPin, ChevronDown, ArrowUpDown } from "lucide-react";

// --- Shared Constants & Types ---

export const AMENITY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "water", label: "Water" },
  { key: "security", label: "Security" },
  { key: "cctv", label: "CCTV" },
  { key: "generator", label: "Generator" },
  { key: "kitchen", label: "Kitchen" },
  { key: "laundry", label: "Laundry" },
  { key: "ac", label: "AC" },
];

export interface FilterProps {
  // Data
  uniqueLocations: string[];
  
  // State
  locationFilter: string;
  setLocationFilter: (v: string) => void;
  
  sortMode: "recommended" | "name_az" | "price_low";
  setSortMode: (v: "recommended" | "name_az" | "price_low") => void;
  
  roomTypeFilter: string;
  setRoomTypeFilter: (v: string) => void;
  
  distanceFilter: string;
  setDistanceFilter: (v: string) => void;
  
  priceMinStr: string;
  setPriceMinStr: (v: string) => void;
  
  priceMaxStr: string;
  setPriceMaxStr: (v: string) => void;
  
  selectedAmenities: string[];
  toggleAmenity: (key: string) => void;

  // Actions
  clearAll: () => void;
}

interface DrawerProps extends FilterProps {
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
}

// --- UI Components ---

export function Chip({ label, active, onClick, icon }: { label: string; active?: boolean; onClick: () => void; icon?: ReactNode; }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold shadow-sm transition active:scale-[0.99]",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700",
      ].join(" ")}
      type="button"
    >
      {icon}
      <span className="truncate max-w-[180px]">{label}</span>
      {active ? <Check className="h-4 w-4" /> : null}
    </button>
  );
}

// --- Mobile Filter Drawer ---
export function MobileFilterDrawer(props: DrawerProps) {
  const {
    showFilters, setShowFilters,
    locationFilter, setLocationFilter, uniqueLocations,
    sortMode, setSortMode,
    roomTypeFilter, setRoomTypeFilter,
    distanceFilter, setDistanceFilter,
    priceMinStr, setPriceMinStr, priceMaxStr, setPriceMaxStr,
    selectedAmenities, toggleAmenity,
    clearAll
  } = props;

  return (
    <div className={`md:hidden mt-4 overflow-hidden transition-all duration-300 ease-out ${showFilters ? "max-h-[1000px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2"}`}>
      <div className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <button type="button" onClick={() => setShowFilters(false)} className="text-sm font-extrabold text-slate-700 hover:text-slate-900">
            Close
          </button>
        </div>

        {/* Location */}
        <div className="mb-4">
           <div className="text-xs font-extrabold text-slate-600 mb-2">Location</div>
           <div className="relative">
              <MapPin className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
              <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm">
                 {uniqueLocations.map((loc, i) => <option key={i} value={loc}>{loc === "All" ? "Any Location" : loc}</option>)}
              </select>
           </div>
        </div>

        {/* Sort */}
        <div className="mb-4">
           <div className="text-xs font-extrabold text-slate-600 mb-2">Sort</div>
           <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm">
                 <option value="recommended">Recommended</option>
                 <option value="price_low">Lowest price</option>
                 <option value="name_az">Name A–Z</option>
              </select>
           </div>
        </div>

        {/* Room Type */}
        <div className="mb-4">
          <div className="text-xs font-extrabold text-slate-600 mb-2">Room Type</div>
          <div className="relative">
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm">
              <option value="Any">Any</option>
              <option value="Self-contained">Self-contained</option>
              <option value="Single">Single</option>
              <option value="Shared">Shared</option>
              <option value="Chamber & Hall">Chamber & Hall</option>
            </select>
          </div>
        </div>

        {/* Price & Distance */}
        <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
                 <div className="text-xs font-extrabold text-slate-600 mb-2">Price Min</div>
                 <input value={priceMinStr} onChange={e=>setPriceMinStr(e.target.value)} placeholder="Min" className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"/>
            </div>
            <div>
                 <div className="text-xs font-extrabold text-slate-600 mb-2">Price Max</div>
                 <input value={priceMaxStr} onChange={e=>setPriceMaxStr(e.target.value)} placeholder="Max" className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"/>
            </div>
        </div>
        
        <div className="mb-4">
            <div className="text-xs font-extrabold text-slate-600 mb-2">Distance</div>
            <div className="flex flex-wrap gap-2">
                 <Chip label="Any" active={distanceFilter==="Any"} onClick={()=>setDistanceFilter("Any")}/>
                 <Chip label="Near campus" active={distanceFilter==="Near campus"} onClick={()=>setDistanceFilter("Near campus")} icon={<MapPin className="h-4 w-4"/>}/>
            </div>
        </div>

        {/* Amenities */}
        <div className="mb-4">
             <div className="text-xs font-extrabold text-slate-600 mb-2">Amenities</div>
             <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                    <Chip key={a.key} label={a.label} active={selectedAmenities.includes(a.key)} onClick={()=>toggleAmenity(a.key)}/>
                ))}
             </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button onClick={clearAll} className="flex-1 rounded-xl bg-slate-900 py-3 text-white font-bold transition hover:bg-slate-800">Clear all</button>
          <button onClick={()=>setShowFilters(false)} className="flex-1 rounded-xl border-2 border-slate-200 py-3 font-bold transition hover:border-emerald-200 hover:text-emerald-700">Apply</button>
        </div>
      </div>
    </div>
  );
}

// --- Desktop Filter Bar ---
export function DesktopFilterBar(props: FilterProps) {
  const {
    roomTypeFilter, setRoomTypeFilter,
    distanceFilter, setDistanceFilter,
    priceMinStr, setPriceMinStr, priceMaxStr, setPriceMaxStr,
    selectedAmenities, toggleAmenity
  } = props;

  return (
    <div className="hidden md:block mt-5">
      <div className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-extrabold text-slate-600 mr-2">Quick filters</span>

          <Chip
            label="Near campus"
            active={distanceFilter === "Near campus"}
            onClick={() => setDistanceFilter(distanceFilter === "Near campus" ? "Any" : "Near campus")}
            icon={<MapPin className="h-4 w-4" />}
          />

          <Chip
            label="Self-contained"
            active={roomTypeFilter === "Self-contained"}
            onClick={() => setRoomTypeFilter(roomTypeFilter === "Self-contained" ? "Any" : "Self-contained")}
          />

          <Chip
            label="Shared"
            active={roomTypeFilter === "Shared"}
            onClick={() => setRoomTypeFilter(roomTypeFilter === "Shared" ? "Any" : "Shared")}
          />

          <Chip label="Wi-Fi" active={selectedAmenities.includes("wifi")} onClick={() => toggleAmenity("wifi")} />
          <Chip label="Security" active={selectedAmenities.includes("security")} onClick={() => toggleAmenity("security")} />

          <div className="ml-auto flex items-center gap-2">
            <input
              value={priceMinStr}
              onChange={(e) => setPriceMinStr(e.target.value)}
              placeholder="Min"
              className="w-24 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
            />
            <input
              value={priceMaxStr}
              onChange={(e) => setPriceMaxStr(e.target.value)}
              placeholder="Max"
              className="w-24 rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
            />
            <div className="text-xs font-extrabold text-slate-500">Price</div>
          </div>
        </div>
      </div>
    </div>
  );
}