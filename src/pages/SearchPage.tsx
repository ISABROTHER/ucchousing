import { useState, useEffect, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  SearchX,
  Image as ImageIcon,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { getHostels } from "../lib/hostels";
import { PageType } from "../App";

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

// We use 'any' to easily handle the mix of API data and manual manual data
type Hostel = any;

// --- Helpers (Same as HomeFeatured) ---
function getStringField(obj: any, key: string) {
  return typeof obj?.[key] === "string" ? obj[key] : undefined;
}

function toText(v: any): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(toText).join(" ");
  if (v && typeof v === "object") return Object.values(v).map(toText).join(" ");
  return "";
}

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  const n = normalize(s);
  if (!n) return [];
  return n.split(" ").filter(Boolean);
}

// very small fuzzy: tokens must be "mostly present" (substring in any field tokens)
function fuzzyTokenMatch(text: string, queryTokens: string[]): number {
  const t = tokenize(text);
  if (!t.length || !queryTokens.length) return 0;

  let hits = 0;
  for (const q of queryTokens) {
    if (q.length <= 1) continue;
    const found = t.some((w) => w.includes(q) || q.includes(w));
    if (found) hits += 1;
  }

  // score scaled: 0..100
  return Math.round((hits / Math.max(1, queryTokens.length)) * 100);
}

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find((x) => typeof x === "string" && x);
  return found ? [found] : [];
}

function extractPrice(hostel: any): number | null {
  // tries common keys; safe if not present
  const candidates = [
    hostel.price,
    hostel.price_per_semester,
    hostel.price_per_year,
    hostel.price_per_month,
    hostel.price_from,
    hostel.min_price,
  ];

  for (const c of candidates) {
    if (typeof c === "number" && isFinite(c)) return c;
    if (typeof c === "string") {
      const m = c.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

type Intent = {
  queryTokens: string[];
  priceMax?: number;
  priceMin?: number;
  wantsCheap?: boolean;
  nearCampus?: boolean;
  roomTypeHints: string[]; // e.g. ["self-contained", "shared", "single"]
  amenityHints: string[]; // e.g. ["wifi", "water", "security", "generator"]
};

function parseIntent(raw: string): Intent {
  const q = normalize(raw);
  const tokens = tokenize(q);

  const intent: Intent = {
    queryTokens: tokens,
    roomTypeHints: [],
    amenityHints: [],
  };

  // price intent patterns: "under 800", "below 1200", "< 1000", "max 900"
  const priceMaxMatch =
    q.match(/(under|below|max|less than)\s+(\d{2,6})/) ||
    q.match(/<\s*(\d{2,6})/);
  if (priceMaxMatch) {
    const n = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);
    if (isFinite(n)) intent.priceMax = n;
  }

  const priceMinMatch =
    q.match(/(over|above|min|more than)\s+(\d{2,6})/) ||
    q.match(/>\s*(\d{2,6})/);
  if (priceMinMatch) {
    const n = Number(priceMinMatch[2] ?? priceMinMatch[1]);
    if (isFinite(n)) intent.priceMin = n;
  }

  // cheap intent words
  if (tokens.includes("cheap") || tokens.includes("budget") || tokens.includes("affordable")) {
    intent.wantsCheap = true;
  }

  // near campus intent words
  if (
    q.includes("near campus") ||
    q.includes("close to campus") ||
    q.includes("on campus") ||
    tokens.includes("campus") ||
    tokens.includes("ucc")
  ) {
    intent.nearCampus = true;
  }

  // room type hints (ghana terms)
  const roomTypeMap: Array<[string[], string]> = [
    [["self", "con"], "self-contained"],
    [["self-contained"], "self-contained"],
    [["selfcontained"], "self-contained"],
    [["single"], "single"],
    [["shared"], "shared"],
    [["2", "in", "1"], "shared"],
    [["two", "in", "one"], "shared"],
    [["chamber"], "chamber"],
    [["hall"], "hall"],
    [["chamber", "and", "hall"], "chamber & hall"],
  ];

  for (const [keys, label] of roomTypeMap) {
    const hit = keys.every((k) => tokens.includes(k));
    if (hit && !intent.roomTypeHints.includes(label)) intent.roomTypeHints.push(label);
  }

  // amenity hints
  const amenityKeywords = [
    "wifi",
    "water",
    "security",
    "cctv",
    "generator",
    "backup",
    "kitchen",
    "bathroom",
    "toilet",
    "ac",
    "aircon",
    "laundry",
  ];
  for (const k of amenityKeywords) {
    if (tokens.includes(k)) intent.amenityHints.push(k);
  }

  return intent;
}

function hostelHaystack(hostel: any): {
  name: string;
  location: string;
  address: string;
  features: string;
} {
  const name = getStringField(hostel, "name") || "";
  const location = getStringField(hostel, "location") || "";
  const address = getStringField(hostel, "address") || "";

  // try to gather amenities/features from common keys
  const featuresRaw =
    hostel.features ??
    hostel.amenities ??
    hostel.facilities ??
    hostel.tags ??
    hostel.category ??
    hostel.room_type ??
    hostel.roomType ??
    hostel.type ??
    "";

  const features = toText(featuresRaw);

  return { name, location, address, features };
}

function isNearCampus(hostel: any): boolean {
  const { location, address, features } = hostelHaystack(hostel);
  const t = normalize(`${location} ${address} ${features}`);
  // simple heuristic keywords
  return (
    t.includes("on campus") ||
    t.includes("near campus") ||
    t.includes("close to campus") ||
    t.includes("ucc") ||
    t.includes("campus")
  );
}

function matchesRoomType(hostel: any, hints: string[]): boolean {
  if (!hints.length) return true;
  const t = normalize(toText(hostel.room_type ?? hostel.roomType ?? hostel.category ?? hostel.type ?? hostel.features ?? ""));
  return hints.some((h) => t.includes(normalize(h)));
}

function matchesAmenities(hostel: any, hints: string[]): boolean {
  if (!hints.length) return true;
  const t = normalize(toText(hostel.amenities ?? hostel.features ?? hostel.facilities ?? hostel.tags ?? ""));
  return hints.every((h) => t.includes(normalize(h)));
}

// --- Mosaic Card Component (Same design as Featured) ---
function SearchMosaicCard({ hostel, onOpen }: { hostel: any; onOpen: () => void }) {
  const name = getStringField(hostel, "name") || "Hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const images = getImageUrls(hostel);

  // Ensure we have at least 5 images for the full mosaic
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) {
    safeImages.push(safeImages[0]);
  }

  const [a, b, c, d, e] = safeImages;

  const price = extractPrice(hostel);

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      {/* 1. MOSAIC GRID IMAGES */}
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
          {/* Large Left Image */}
          <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">
            {a ? (
              <img
                src={a}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                alt="Main"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-slate-400" />
              </div>
            )}
          </div>

          {/* Top Right 1 */}
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {b ? (
              <img
                src={b}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                alt="Detail 1"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Top Right 2 */}
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {c ? (
              <img
                src={c}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                alt="Detail 2"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Bottom Right 1 */}
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {d ? (
              <img
                src={d}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                alt="Detail 3"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Bottom Right 2 */}
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {e ? (
              <img
                src={e}
                className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                alt="Detail 4"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
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
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">
            {name}
          </h3>

          {/* Minimal “AI-era” quick signal (only if price exists) */}
          {price !== null && (
            <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>From {price.toLocaleString()}</span>
            </div>
          )}
        </div>

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

type SortMode = "recommended" | "name_az" | "price_low";

// --- Main Page Component ---
export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Filter States --
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  // Debounce typing for smooth transitions (mobile-first feel)
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

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
            main_image: "https://i.imgur.com/luYRCIq.jpeg",
            images: [
              "https://i.imgur.com/luYRCIq.jpeg",
              "https://i.imgur.com/peh4mP5.jpeg",
              "https://i.imgur.com/CKdT7Di.jpeg",
              "https://i.imgur.com/Ci2Vn7D.jpeg",
            ],
          },
          {
            id: "adoration-home-plus-manual",
            name: "Adoration Home Plus Hostel",
            address: "Ayensu, UCC",
            location: "Ayensu",
            main_image: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
            images: [
              "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
              "https://getrooms.co/wp-content/uploads/2022/10/adoration1-300x300.jpg",
              "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1-300x300.png",
              "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
            ],
          },
        ];

        // Merge without duplicates
        const existingNames = new Set(list.map((h: any) => (h.name ? String(h.name).toLowerCase() : "")));
        manualHostels.forEach((m) => {
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

  // Extract unique locations (cleaned)
  const uniqueLocations = useMemo(() => {
    const locs = new Set(
      hostels
        .map((h) => h.location || h.address || "")
        .filter(Boolean)
        .map((l) => String(l))
    );

    const cleanLocs = Array.from(locs)
      .map((l) => l.split(",")[0].trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));

    return ["All", ...cleanLocs];
  }, [hostels]);

  // AI-era intent parsing
  const intent = useMemo(() => parseIntent(debouncedSearch), [debouncedSearch]);

  // Relevance scoring (no dependency; safe & fast)
  const scoredHostels = useMemo(() => {
    const locFilterNorm = normalize(locationFilter === "All" ? "" : locationFilter);

    const results = hostels
      .map((hostel) => {
        const { name, location, address, features } = hostelHaystack(hostel);

        const nameN = normalize(name);
        const locN = normalize(location);
        const addrN = normalize(address);
        const featN = normalize(features);

        // 1) location dropdown (case-insensitive)
        const matchesLocation =
          locationFilter === "All" ||
          (!!locFilterNorm &&
            (locN.includes(locFilterNorm) || addrN.includes(locFilterNorm)));

        // 2) intent filters (only applied if user implies them)
        const p = extractPrice(hostel);
        const matchesPriceMax =
          intent.priceMax == null || p == null ? true : p <= intent.priceMax;
        const matchesPriceMin =
          intent.priceMin == null || p == null ? true : p >= intent.priceMin;

        // cheap intent: if user says cheap and price exists, slightly prefer cheaper later in ranking
        const matchesNearCampus = intent.nearCampus ? isNearCampus(hostel) : true;

        const matchesRoom = matchesRoomType(hostel, intent.roomTypeHints);
        const matchesAmenity = matchesAmenities(hostel, intent.amenityHints);

        // 3) search / fuzzy relevance
        const qTokens = intent.queryTokens;

        // weighted matching
        const sName = fuzzyTokenMatch(nameN, qTokens);
        const sLoc = fuzzyTokenMatch(locN, qTokens);
        const sAddr = fuzzyTokenMatch(addrN, qTokens);
        const sFeat = fuzzyTokenMatch(featN, qTokens);

        // completeness signals
        const imgCount = getImageUrls(hostel).length;
        const hasImages = imgCount > 0 ? 1 : 0;
        const hasPrice = extractPrice(hostel) != null ? 1 : 0;

        // base relevance score
        let score =
          sName * 3 +
          sLoc * 2 +
          sAddr * 1 +
          sFeat * 1 +
          hasImages * 60 +
          hasPrice * 40;

        // If query is empty, don't over-score by fuzzy; still prefer complete listings
        if (!qTokens.length) {
          score = hasImages * 60 + hasPrice * 40;
        }

        // cheap intent nudges cheaper upward if price exists
        if (intent.wantsCheap && p != null) {
          // subtract small portion of price to rank cheaper higher, without breaking relevance
          score += Math.max(0, 8000 - p) / 50; // gentle nudge
        }

        // near campus intent boost if near
        if (intent.nearCampus && matchesNearCampus) score += 80;

        // room/amenity intent boost
        if (intent.roomTypeHints.length && matchesRoom) score += 60;
        if (intent.amenityHints.length && matchesAmenity) score += 40;

        // final gate: if user typed something, ensure at least some match somewhere OR intent filters match strongly
        const hasQuery = qTokens.length > 0;
        const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;

        const passesQueryGate = !hasQuery || anyFuzzyHit || intent.roomTypeHints.length > 0 || intent.amenityHints.length > 0 || intent.priceMax != null || intent.priceMin != null;

        const passesAll =
          matchesLocation &&
          matchesPriceMax &&
          matchesPriceMin &&
          matchesNearCampus &&
          matchesRoom &&
          matchesAmenity &&
          passesQueryGate;

        return { hostel, score, price: p, passesAll };
      })
      .filter((x) => x.passesAll);

    // sorting
    const sorted = [...results].sort((a, b) => {
      if (sortMode === "name_az") {
        const an = normalize(getStringField(a.hostel, "name") || "");
        const bn = normalize(getStringField(b.hostel, "name") || "");
        return an.localeCompare(bn);
      }

      if (sortMode === "price_low") {
        const ap = a.price ?? Number.POSITIVE_INFINITY;
        const bp = b.price ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return b.score - a.score;
      }

      // recommended (relevance)
      return b.score - a.score;
    });

    return sorted;
  }, [hostels, intent, locationFilter, sortMode]);

  const filteredHostels = useMemo(() => scoredHostels.map((x) => x.hostel), [scoredHostels]);

  // Active filter pills
  const activePills = useMemo(() => {
    const pills: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (searchTerm.trim()) {
      pills.push({
        key: "search",
        label: `Search: ${searchTerm.trim()}`,
        onClear: () => setSearchTerm(""),
      });
    }

    if (locationFilter !== "All") {
      pills.push({
        key: "location",
        label: `Location: ${locationFilter}`,
        onClear: () => setLocationFilter("All"),
      });
    }

    if (sortMode !== "recommended") {
      pills.push({
        key: "sort",
        label: sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z",
        onClear: () => setSortMode("recommended"),
      });
    }

    // Intent pills (only show if user typed them)
    if (intent.priceMax != null) {
      pills.push({
        key: "intent_price_max",
        label: `Max: ${intent.priceMax.toLocaleString()}`,
        onClear: () => setSearchTerm((prev) => prev.replace(/\b(under|below|max|less than)\s+\d{2,6}\b/i, "").replace(/<\s*\d{2,6}/i, "").trim()),
      });
    }

    if (intent.nearCampus && searchTerm.trim()) {
      pills.push({
        key: "intent_near",
        label: "Near campus",
        onClear: () =>
          setSearchTerm((prev) =>
            prev
              .replace(/near campus/gi, "")
              .replace(/close to campus/gi, "")
              .replace(/\bucc\b/gi, "")
              .replace(/\bcampus\b/gi, "")
              .replace(/\s+/g, " ")
              .trim()
          ),
      });
    }

    return pills;
  }, [searchTerm, locationFilter, sortMode, intent.priceMax, intent.nearCampus]);

  const clearAll = () => {
    setSearchTerm("");
    setLocationFilter("All");
    setSortMode("recommended");
  };

  const showResultsFade = loading || isTyping;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        {/* --- Header & Search Controls --- */}
        {/* Mobile-first: Sticky controls so users don't lose search while scrolling */}
        <div className="mb-8 md:mb-10">
          <div className="md:static sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 backdrop-blur border-b border-slate-100 md:border-0">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 md:mb-6">Search Hostels</h1>

            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-shadow"
                  placeholder='Try: "under 800 near campus", "self con Ayensu", "wifi"'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {/* subtle typing indicator (AI-era feel, lightweight) */}
                <div
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    isTyping ? "text-emerald-600" : "text-slate-400"
                  } transition-colors`}
                >
                  {isTyping ? "Searching…" : ""}
                </div>
              </div>

              {/* Filter + Sort */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm active:scale-[0.99] transition-transform"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>

                <div
                  className={`${
                    showFilters ? "flex" : "hidden"
                  } md:flex flex-col md:flex-row gap-2 w-full md:w-auto transition-all duration-300`}
                >
                  {/* Location Dropdown */}
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
                        <option key={i} value={loc}>
                          {loc === "All" ? "Any Location" : loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Dropdown (AI-era recommended relevance) */}
                  <div className="relative min-w-[210px]">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={sortMode}
                      onChange={(e) => setSortMode(e.target.value as SortMode)}
                      className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Lowest price</option>
                      <option value="name_az">Name A–Z</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Result count + filter pills */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-bold text-slate-700">
                  {loading ? "Loading hostels…" : `${filteredHostels.length.toLocaleString()} hostels found`}
                </div>

                {(searchTerm.trim() || locationFilter !== "All" || sortMode !== "recommended") && (
                  <button
                    onClick={clearAll}
                    className="text-sm font-extrabold text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {activePills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activePills.map((p) => (
                    <button
                      key={p.key}
                      onClick={p.onClear}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition"
                      title="Remove"
                    >
                      <span className="max-w-[220px] truncate">{p.label}</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Results Section --- */}
        <div className={`transition-opacity duration-300 ${showResultsFade ? "opacity-60" : "opacity-100"}`}>
          {loading ? (
            // Loading Skeletons - Matched size to new card format
            <div className="grid grid-cols-1 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[2rem] border-2 border-slate-200 bg-white p-4 animate-pulse">
                  <div className="h-80 w-full bg-slate-100 rounded-[1.5rem] mb-4" />
                  <div className="h-6 w-1/3 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-1/4 bg-slate-100 rounded" />
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
            // --- EMPTY STATE (smarter suggestions) ---
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 border-2 border-slate-200">
                <SearchX className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900">No hostels found</h3>
              <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
                We couldn't find any matches for{" "}
                <span className="font-extrabold text-slate-700">"{searchTerm || "your filters"}"</span>.
                <br />
                Try one of these:
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-lg">
                {["Ayensu", "Amamoma", "under 800", "near campus", "self con", "wifi"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSearchTerm(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={clearAll}
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
