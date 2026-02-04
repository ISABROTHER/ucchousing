import { useState, useRef } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  SearchX,
  ArrowUpDown,
  X,
} from "lucide-react";
import { PageType } from "../App";
import { MobileFilterDrawer, DesktopFilterBar, AMENITY_OPTIONS } from "./search/SearchFilters";
import { useHostelSearch } from "../hooks/useHostelSearch";
import { SearchMosaicCard, Pill } from "./search/SearchComponents";
import { TextUtils } from "../lib/search";

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const { state, actions, computed } = useHostelSearch();
  
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Pagination (View Logic)
  const [visibleCount, setVisibleCount] = useState(12);
  const paged = computed.filteredItems.slice(0, visibleCount);

  // Handlers
  const applySuggestion = (s: string) => {
    actions.setSearchTerm(s);
    setShowSuggestions(false);
    setActiveSuggestion(0);
    inputRef.current?.focus();
  };

  const handleClearAll = () => {
    actions.clearAll();
    setVisibleCount(12);
  };

  // Build Filter Props for UI Components
  const filterProps = {
    uniqueLocations: computed.uniqueLocations,
    locationFilter: state.locationFilter,
    setLocationFilter: (v: string) => { actions.setLocationFilter(v); setVisibleCount(12); },
    sortMode: state.sortMode,
    setSortMode: (v: any) => { actions.setSortMode(v); setVisibleCount(12); },
    roomTypeFilter: state.roomTypeFilter,
    setRoomTypeFilter: (v: string) => { actions.setRoomTypeFilter(v); setVisibleCount(12); },
    distanceFilter: state.distanceFilter,
    setDistanceFilter: (v: string) => { actions.setDistanceFilter(v); setVisibleCount(12); },
    priceMinStr: state.priceMinStr,
    setPriceMinStr: (v: string) => { actions.setPriceMinStr(v); setVisibleCount(12); },
    priceMaxStr: state.priceMaxStr,
    setPriceMaxStr: (v: string) => { actions.setPriceMaxStr(v); setVisibleCount(12); },
    selectedAmenities: state.selectedAmenities,
    toggleAmenity: (v: string) => { actions.toggleAmenity(v); setVisibleCount(12); },
    clearAll: handleClearAll,
  };

  // Construct Active Pills (View Logic)
  const activePills: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (state.searchTerm.trim()) activePills.push({ key: "search", label: `Search: ${state.searchTerm}`, onClear: () => actions.setSearchTerm("") });
  if (state.locationFilter !== "All") activePills.push({ key: "location", label: `Location: ${state.locationFilter}`, onClear: () => actions.setLocationFilter("All") });
  if (state.sortMode !== "recommended") activePills.push({ key: "sort", label: state.sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z", onClear: () => actions.setSortMode("recommended") });
  if (state.roomTypeFilter !== "Any") activePills.push({ key: "room", label: `Room: ${state.roomTypeFilter}`, onClear: () => actions.setRoomTypeFilter("Any") });
  if (state.distanceFilter !== "Any") activePills.push({ key: "distance", label: `Distance: ${state.distanceFilter}`, onClear: () => actions.setDistanceFilter("Any") });
  if (state.selectedAmenities.length) state.selectedAmenities.forEach((a) => activePills.push({ key: `amenity_${a}`, label: `Amenity: ${AMENITY_OPTIONS.find((o) => o.key === a)?.label || a}`, onClear: () => actions.toggleAmenity(a) }));
  if (state.priceMinStr.trim()) activePills.push({ key: "pmin", label: `Min: ${state.priceMinStr}`, onClear: () => actions.setPriceMinStr("") });
  if (state.priceMaxStr.trim()) activePills.push({ key: "pmax", label: `Max: ${state.priceMaxStr}`, onClear: () => actions.setPriceMaxStr("") });
  if (computed.intent.nearCampus && state.searchTerm.trim()) activePills.push({ key: "intent_near", label: "Intent: Near campus", onClear: () => actions.setSearchTerm((prev) => prev.replace(/near campus|close to campus|ucc|campus/gi, "").trim()) });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 md:mb-10">
          <div className="md:static sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 backdrop-blur border-b border-slate-100 md:border-0">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 md:mb-6">Search Hostels</h1>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-shadow"
                  placeholder='Try: "under 800 near campus", "self con Ayensu"'
                  value={state.searchTerm}
                  onChange={(e) => {
                    actions.setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setActiveSuggestion(0);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (!showSuggestions || !computed.suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((p) => Math.min(p + 1, computed.suggestions.length - 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((p) => Math.max(p - 1, 0)); }
                    if (e.key === "Enter") { e.preventDefault(); applySuggestion(computed.suggestions[activeSuggestion]); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                />

                {state.searchTerm.trim() && (
                  <button onClick={() => actions.setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100" type="button">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}

                {showSuggestions && computed.suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl z-40">
                    {computed.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => applySuggestion(s)}
                        className={`w-full text-left px-4 py-3 text-sm font-extrabold ${idx === activeSuggestion ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-800"}`}
                        type="button"
                        onMouseEnter={() => setActiveSuggestion(idx)}
                      >
                        {TextUtils.highlight(s, state.searchTerm)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
                type="button"
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>

              {/* Desktop Compact Controls */}
              <div className="hidden md:flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative min-w-[200px]">
                  <MapPin className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                  <select
                    value={state.locationFilter}
                    onChange={(e) => { actions.setLocationFilter(e.target.value); setVisibleCount(12); }}
                    className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                  >
                    {computed.uniqueLocations.map((loc, i) => (
                      <option key={i} value={loc}>
                        {loc === "All" ? "Any Location" : loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-[200px]">
                  <ArrowUpDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                  <select
                    value={state.sortMode}
                    onChange={(e) => { actions.setSortMode(e.target.value as any); setVisibleCount(12); }}
                    className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Lowest price</option>
                    <option value="name_az">Name A–Z</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="text-sm font-bold text-slate-700">{state.loading ? "Loading..." : `${computed.filteredItems.length} hostels found`}</div>
              {activePills.length > 0 && (
                <button onClick={handleClearAll} className="text-sm font-extrabold text-slate-900 hover:text-emerald-700" type="button">
                  Clear all
                </button>
              )}
            </div>

            {activePills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activePills.map((p) => (
                  <Pill key={p.key} label={p.label} onClear={p.onClear} />
                ))}
              </div>
            )}
          </div>

          <MobileFilterDrawer {...filterProps} showFilters={showFilters} setShowFilters={setShowFilters} />
          <DesktopFilterBar {...filterProps} />
        </div>

        {/* Results Grid */}
        <div className={`transition-opacity duration-300 ${state.loading || state.isTyping ? "opacity-60" : "opacity-100"}`}>
          {state.loading ? (
            <div className="grid grid-cols-1 gap-8 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-80 bg-slate-200 rounded-[2rem]" />
              ))}
            </div>
          ) : computed.filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {paged.map((it) => (
                <SearchMosaicCard key={it.id} item={it} query={state.debouncedSearch} onOpen={() => onNavigate("detail", it.id)} />
              ))}

              {computed.filteredItems.length > visibleCount && (
                <div className="flex justify-center mt-8">
                  <button onClick={() => setVisibleCount((p) => p + 12)} className="rounded-xl bg-slate-900 px-6 py-3 text-white font-bold shadow-lg" type="button">
                    Load more
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
                <SearchX className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">No matches found</h3>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search term.</p>
              <button onClick={handleClearAll} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-white font-bold" type="button">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}