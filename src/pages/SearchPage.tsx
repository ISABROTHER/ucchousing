import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  SearchX,
  Image as ImageIcon,
  ArrowUpDown,
  Sparkles,
  X,
} from "lucide-react";
import { getAllHostelsRepository } from "../lib/hostels";
import { PageType } from "../App";
// NEW: Import the extracted filter components
import { MobileFilterDrawer, DesktopFilterBar, AMENITY_OPTIONS } from "./search/SearchFilters";

// ----------------------------------------------------------------------
// LAYER 1: DOMAIN & UTILS (Pure Logic)
// ----------------------------------------------------------------------

type Hostel = any;
type PriceUnit = "month" | "semester" | "year" | "day" | "unknown";

// --- Text Processing Helpers ---
const TextUtils = {
  normalize(s: string): string {
    return (s || "")
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9\s.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },
  
  tokenize(s: string): string[] {
    const n = this.normalize(s);
    if (!n) return [];
    return n.split(" ").filter(Boolean);
  },

  getStringField(obj: any, key: string) {
    return typeof obj?.[key] === "string" ? obj[key] : undefined;
  },

  toText(v: any): string {
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (Array.isArray(v)) return v.map(this.toText.bind(this)).join(" ");
    if (v && typeof v === "object") {
      const vals = Object.values(v);
      return vals.slice(0, 30).map(this.toText.bind(this)).join(" ");
    }
    return "";
  },

  highlight(text: string, query: string) {
    const original = String(text || "");
    const token = this.tokenize(query)[0];
    if (!token) return original;
  
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const m = original.match(re);
    if (!m || m.index == null) return original;
  
    const start = m.index;
    const end = start + m[0].length;
  
    return (
      <span>
        {original.slice(0, start)}
        <mark className="rounded bg-emerald-100 px-1 py-0.5 font-extrabold text-emerald-900">
          {original.slice(start, end)}
        </mark>
        {original.slice(end)}
      </span>
    );
  }
};

// --- Fuzzy Search Algorithm ---
const SearchAlgo = {
  editDistance(a: string, b: string): number {
    const s = a || "";
    const t = b || "";
    const m = s.length;
    const n = t.length;
    if (m === 0) return n;
    if (n === 0) return m;
  
    const dp = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;
  
    for (let i = 1; i <= m; i++) {
      let prev = dp[0];
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        const cost = s[i - 1] === t[j - 1] ? 0 : 1;
        dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
        prev = tmp;
      }
    }
    return dp[n];
  },

  score(hay: string, queryTokens: string[]): number {
    if (!queryTokens.length) return 0;
    const hTokens = TextUtils.tokenize(hay);
    if (!hTokens.length) return 0;
  
    let hits = 0;
    for (const q of queryTokens) {
      if (q.length <= 1) continue;
      // Exact substring match
      const direct = hTokens.some((w) => w.includes(q) || q.includes(w));
      if (direct) {
        hits += 1;
        continue;
      }
      // Typo tolerance
      if (q.length >= 2 && q.length <= 10) {
        const close = hTokens.some((w) => {
          if (w.length < 2 || w.length > 14) return false;
          const d = this.editDistance(w, q);
          return d <= (q.length <= 4 ? 1 : 2);
        });
        if (close) hits += 1;
      }
    }
    const ratio = hits / Math.max(1, queryTokens.length);
    return Math.round(Math.max(0, Math.min(100, ratio * 100)));
  }
};

// --- Intent Parsing (NLP Lite) ---
const IntentParser = {
  AMENITY_SYNONYMS: {
    wifi: ["wifi", "wi-fi", "internet", "wireless", "hotspot"],
    water: ["water", "running water", "pipe borne", "pipe-borne"],
    security: ["security", "guard", "security man", "watchman", "gated", "secure"],
    cctv: ["cctv", "camera", "surveillance"],
    generator: ["generator", "backup", "power backup", "light backup", "inverter"],
    kitchen: ["kitchen", "shared kitchen", "kitchenette", "cooking"],
    laundry: ["laundry", "washing", "washing area", "washing machine"],
    ac: ["ac", "aircon", "air con", "air-condition", "air conditioning"],
  } as Record<string, string[]>,

  parse(raw: string) {
    const q = TextUtils.normalize(raw);
    const tokens = TextUtils.tokenize(q);
    
    const intent = { 
      queryTokens: tokens, 
      priceMax: undefined as number | undefined, 
      priceMin: undefined as number | undefined, 
      wantsCheap: false, 
      nearCampus: false,
      roomTypeHints: [] as string[],
      amenityHints: [] as string[]
    };
  
    // Price
    const priceMaxMatch = q.match(/(under|below|max|less than)\s+(\d{2,6})/) || q.match(/<\s*(\d{2,6})/);
    if (priceMaxMatch) intent.priceMax = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);
  
    const priceMinMatch = q.match(/(over|above|min|more than)\s+(\d{2,6})/) || q.match(/>\s*(\d{2,6})/);
    if (priceMinMatch) intent.priceMin = Number(priceMinMatch[2] ?? priceMinMatch[1]);
  
    if (tokens.includes("cheap") || tokens.includes("budget") || tokens.includes("affordable")) {
      intent.wantsCheap = true;
    }
  
    // Location
    if (q.match(/near campus|close to campus|on campus|ucc|campus/)) {
      intent.nearCampus = true;
    }
  
    // Room Type Hints
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
      if (keys.every((k) => tokens.includes(k))) {
         if (!intent.roomTypeHints.includes(label)) intent.roomTypeHints.push(label);
      }
    }
  
    // Amenities
    for (const k of Object.keys(this.AMENITY_SYNONYMS)) {
      const syns = this.AMENITY_SYNONYMS[k] ?? [];
      if (syns.some((s) => q.includes(TextUtils.normalize(s)))) intent.amenityHints.push(k);
    }
    intent.amenityHints = Array.from(new Set(intent.amenityHints));
  
    return intent;
  }
};

// --- Indexer ---
// Transforming Raw Hostel Data into efficient Searchable Objects
type IndexedHostel = {
  id: string;
  hostel: any;
  name: string;
  location: string;
  address: string;
  nameN: string;
  locationN: string;
  addressN: string;
  featuresN: string;
  roomTypeN: string;
  amenityN: string;
  imgCount: number;
  hasImages: number;
  price: number | null;
  priceUnit: PriceUnit;
  hasPrice: number;
  nearCampus: boolean;
};

const Indexer = {
  // Stable ID Generation
  stableHash(input: string): string {
    let h = 5381;
    const s = input || "";
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  },

  getStableId(hostel: any): string {
    const id = hostel?.id ?? hostel?.uuid ?? hostel?.slug;
    if (typeof id === "string" && id.trim()) return id;
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    const name = TextUtils.getStringField(hostel, "name") || "";
    const loc = TextUtils.getStringField(hostel, "location") || TextUtils.getStringField(hostel, "address") || "";
    return `hostel_${this.stableHash(TextUtils.normalize(`${name}|${loc}`))}`;
  },

  getImageUrls(hostel: any): string[] {
    const arrays = [hostel.images, hostel.image_urls, hostel.photos];
    for (const v of arrays) if (Array.isArray(v) && v.length) return v;
    const singles = [hostel.main_image, hostel.cover_image, hostel.image];
    const found = singles.find((x) => typeof x === "string" && x);
    return found ? [found] : [];
  },

  extractPriceWithUnit(hostel: any): { price: number | null; unit: PriceUnit } {
    const direct: Array<[any, PriceUnit]> = [
      [hostel.price_per_month, "month"],
      [hostel.price_per_semester, "semester"],
      [hostel.price_per_year, "year"],
      [hostel.price_per_day, "day"],
    ];
  
    for (const [v, unit] of direct) {
      if (typeof v === "number" && Number.isFinite(v)) return { price: v, unit };
      if (typeof v === "string") {
        const m = v.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
        if (m) return { price: Number(m[1]), unit };
      }
    }
    // Generic fallback
    const candidates = [hostel.price, hostel.price_from, hostel.min_price];
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c)) return { price: c, unit: "unknown" };
      if (typeof c === "string") {
        const m = c.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
        if (m) return { price: Number(m[1]), unit: "unknown" };
      }
    }
    return { price: null, unit: "unknown" };
  },

  isNearCampus(locationNorm: string, addressNorm: string, featuresNorm: string): boolean {
    const combined = `${locationNorm} ${addressNorm} ${featuresNorm}`;
    const NEAR_CAMPUS_AREAS = ["ayensu", "amamoma", "kwaprow", "ape wosika", "new site", "old site", "kakumdo"];
    if (combined.match(/on campus|near campus|close to campus|ucc|campus/)) return true;
    return NEAR_CAMPUS_AREAS.some((a) => combined.includes(a));
  },

  build(hostels: any[]): IndexedHostel[] {
    return hostels.map((h) => {
      const id = this.getStableId(h);
      const name = TextUtils.getStringField(h, "name") || "Hostel";
      const location = TextUtils.getStringField(h, "location") || "";
      const address = TextUtils.getStringField(h, "address") || "";
  
      const featuresRaw = h.features ?? h.amenities ?? h.facilities ?? h.tags ?? h.description ?? h.category ?? "";
      const roomRaw = h.room_type ?? h.roomType ?? h.type ?? h.category ?? "";
      const amenityRaw = h.amenities ?? h.features ?? h.facilities ?? h.tags ?? "";
  
      const nameN = TextUtils.normalize(name);
      const locationN = TextUtils.normalize(location);
      const addressN = TextUtils.normalize(address);
      const featuresN = TextUtils.normalize(TextUtils.toText(featuresRaw));
      const roomTypeN = TextUtils.normalize(TextUtils.toText(roomRaw));
      const amenityN = TextUtils.normalize(TextUtils.toText(amenityRaw));
  
      const imgs = this.getImageUrls(h);
      const { price, unit } = this.extractPriceWithUnit(h);
      
      return {
        id,
        hostel: h,
        name,
        location,
        address,
        nameN,
        locationN,
        addressN,
        featuresN,
        roomTypeN,
        amenityN,
        imgCount: imgs.length,
        hasImages: imgs.length > 0 ? 1 : 0,
        price,
        priceUnit: unit,
        hasPrice: price != null ? 1 : 0,
        nearCampus: this.isNearCampus(locationN, addressN, featuresN),
      };
    });
  }
};

// ----------------------------------------------------------------------
// LAYER 2: UI COMPONENTS (Pure Presentation)
// ----------------------------------------------------------------------

function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition"
      title="Remove"
      type="button"
    >
      <span className="max-w-[240px] truncate">{label}</span>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <X className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function SearchMosaicCard({ item, onOpen, query }: { item: IndexedHostel; onOpen: () => void; query: string; }) {
  const images = Indexer.getImageUrls(item.hostel);
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);
  const [a, b, c, d, e] = safeImages;

  const unitLabel = item.priceUnit === "month" ? "/mo" : item.priceUnit === "semester" ? "/sem" : item.priceUnit === "year" ? "/yr" : item.priceUnit === "day" ? "/day" : "";
  const showPrice = item.price != null;
  
  const chips: string[] = [];
  if (showPrice) chips.push(`From ${item.price!.toLocaleString()}${unitLabel}`);
  
  if (item.roomTypeN.includes("self-contained") || item.roomTypeN.includes("self con")) chips.push("Self-contained");
  else if (item.roomTypeN.includes("shared") || item.roomTypeN.includes("2 in 1")) chips.push("Shared");
  else if (item.roomTypeN.includes("single")) chips.push("Single room");
  
  if (item.nearCampus) chips.push("Near campus");

  // Check amenities
  const hasWifi = IntentParser.AMENITY_SYNONYMS['wifi'].some(s => item.amenityN.includes(TextUtils.normalize(s)));
  if (hasWifi) chips.push("Wi-Fi");
  
  const displayChips = chips.slice(0, 4);

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      <button onClick={onOpen} className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform" type="button">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
          <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">
            {a ? <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Main" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {b ? <img src={b} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 1" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
             {c ? <img src={c} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 2" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {d ? <img src={d} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 3" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
           <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
             {e ? <img src={e} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 4" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
           </div>
        </div>
        <div className="absolute bottom-4 right-4 z-10">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105">
            <ImageIcon className="h-4 w-4" />
            <span>See all photos</span>
          </div>
        </div>
      </button>

      <div className="px-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">{TextUtils.highlight(item.name, query)}</h3>
          <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI ranked</span>
          </div>
        </div>
        {(item.location || item.address) && (
          <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{TextUtils.highlight(item.location || item.address, query)}</span>
          </div>
        )}
        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayChips.map((c) => (
              <span key={c} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// LAYER 3: VIEW CONTROLLER (React Component)
// Connects Layer 1 (Logic) with Layer 2 (UI) and Repository
// ----------------------------------------------------------------------

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  // --- Data State ---
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Search State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  // --- Filter State ---
  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<"recommended" | "name_az" | "price_low">("recommended");
  const [roomTypeFilter, setRoomTypeFilter] = useState("Any");
  const [distanceFilter, setDistanceFilter] = useState("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");

  // --- Suggestions State ---
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // 1. Debounce Input
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
      setVisibleCount(12);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // 2. Fetch Data (From Repository)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getAllHostelsRepository();
        setHostels(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // 3. Build Search Index (Logic Layer)
  const indexed = useMemo(() => Indexer.build(hostels), [hostels]);

  // 4. Calculate Unique Locations
  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    for (const it of indexed) {
      const raw = (it.location || it.address || "").trim();
      if (!raw) continue;
      locs.add(raw.split(",")[0].trim());
    }
    const clean = Array.from(locs).filter(Boolean).sort((a, b) => a.localeCompare(b));
    return ["All", ...clean];
  }, [indexed]);

  // 5. Parse Intent (Logic Layer)
  const intent = useMemo(() => IntentParser.parse(debouncedSearch), [debouncedSearch]);
  
  // 6. Execute Search & Score (Logic Layer)
  const filteredItems = useMemo(() => {
    const locFilterNorm = TextUtils.normalize(locationFilter === "All" ? "" : locationFilter);
    const wantNear = distanceFilter === "Near campus";
    
    // Explicit Inputs
    const pMinInput = (priceMinStr || "").replace(/,/g, "").trim();
    const pMaxInput = (priceMaxStr || "").replace(/,/g, "").trim();
    const priceMin = pMinInput ? Number(pMinInput) : intent.priceMin;
    const priceMax = pMaxInput ? Number(pMaxInput) : intent.priceMax;

    // Room Type Inputs
    let roomTypeNeedles: string[] = [];
    if (roomTypeFilter !== "Any") {
      if (roomTypeFilter === "Self-contained") roomTypeNeedles = ["self-contained", "self con", "selfcontained"];
      else if (roomTypeFilter === "Single") roomTypeNeedles = ["single"];
      else if (roomTypeFilter === "Shared") roomTypeNeedles = ["shared", "2 in 1", "two in one"];
      else roomTypeNeedles = ["chamber", "hall", "chamber & hall"];
    }

    const amenityKeys = Array.from(new Set([...selectedAmenities, ...intent.amenityHints]));
    const qTokens = intent.queryTokens;

    const results = indexed.map((it) => {
        // Filters
        const matchesLocation = locationFilter === "All" || (!!locFilterNorm && (it.locationN.includes(locFilterNorm) || it.addressN.includes(locFilterNorm)));
        const matchesDistance = wantNear ? it.nearCampus : true;
        const matchesRoom = roomTypeNeedles.length ? roomTypeNeedles.some((n) => it.roomTypeN.includes(TextUtils.normalize(n))) : true;
        
        // Amenity Check
        const matchesAmenities = !amenityKeys.length || amenityKeys.every((key) => {
           const syns = IntentParser.AMENITY_SYNONYMS[key] ?? [key];
           return syns.some((s) => it.amenityN.includes(TextUtils.normalize(s)));
        });

        // Price Check
        const matchesPriceMin = priceMin == null || it.price == null ? true : it.price >= priceMin;
        const matchesPriceMax = priceMax == null || it.price == null ? true : it.price <= priceMax;

        // Fuzzy Scoring
        const sName = SearchAlgo.score(it.nameN, qTokens);
        const sLoc = SearchAlgo.score(it.locationN, qTokens);
        const sAddr = SearchAlgo.score(it.addressN, qTokens);
        const sFeat = SearchAlgo.score(it.featuresN, qTokens);

        const hasQuery = qTokens.length > 0;
        const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;

        const passesQueryGate = !hasQuery || anyFuzzyHit || amenityKeys.length > 0 || roomTypeNeedles.length > 0 || priceMin != null || priceMax != null || wantNear;
        
        const passesAll = matchesLocation && matchesDistance && matchesRoom && matchesAmenities && matchesPriceMin && matchesPriceMax && passesQueryGate;

        let score = (sName * 3) + (sLoc * 2) + (sAddr * 1) + (sFeat * 1) + (it.hasImages * 60) + (it.hasPrice * 40);
        if (!qTokens.length) score = (it.hasImages * 60) + (it.hasPrice * 40);
        if (intent.nearCampus && it.nearCampus) score += 80;
        if (intent.wantsCheap && it.price != null) score += Math.max(0, 8000 - it.price) / 50;
        
        // Boost matches on filters
        if (wantNear && it.nearCampus) score += 60;
        if (roomTypeNeedles.length && matchesRoom) score += 40;
        if (amenityKeys.length && matchesAmenities) score += 30;

        return { it, score, passesAll };
    }).filter(x => x.passesAll);

    // Sorting
    results.sort((a, b) => {
       if (sortMode === "name_az") return a.it.nameN.localeCompare(b.it.nameN);
       if (sortMode === "price_low") {
         const ap = a.it.price ?? Infinity;
         const bp = b.it.price ?? Infinity;
         if (ap !== bp) return ap - bp;
       }
       return b.score - a.score;
    });

    return results.map(x => x.it);
  }, [indexed, intent, locationFilter, roomTypeFilter, distanceFilter, selectedAmenities, priceMinStr, priceMaxStr, sortMode]);

  // 7. Suggestions (Logic)
  const suggestions = useMemo(() => {
    const q = TextUtils.normalize(searchTerm);
    const templates = ["under 800 near campus", "under 1000", "self con Ayensu", "Amamoma single room", "wifi + security", "near campus", "shared room", "self-contained", "budget"];
    const locs = uniqueLocations.filter((l) => l !== "All").slice(0, 12);
    
    const merged = Array.from(new Set([...templates, ...locs]));
    if (!q) return merged.slice(0, 10);
    const qTokens = TextUtils.tokenize(q);
    return merged
      .map((s) => ({ s, score: SearchAlgo.score(s, qTokens) }))
      .filter((x) => x.score > 0 || TextUtils.normalize(x.s).includes(q))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
      .slice(0, 10);
  }, [searchTerm, uniqueLocations]);

  // --- Handlers ---
  const applySuggestion = (s: string) => { setSearchTerm(s); setShowSuggestions(false); setActiveSuggestion(0); inputRef.current?.focus(); };
  const toggleAmenity = (key: string) => { setSelectedAmenities((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key])); setVisibleCount(12); };
  const clearAll = () => { setSearchTerm(""); setLocationFilter("All"); setSortMode("recommended"); setRoomTypeFilter("Any"); setDistanceFilter("Any"); setSelectedAmenities([]); setPriceMinStr(""); setPriceMaxStr(""); setVisibleCount(12); };

  const paged = filteredItems.slice(0, visibleCount);
  const activePills = [];
  if (searchTerm.trim()) activePills.push({ key: "search", label: `Search: ${searchTerm}`, onClear: () => setSearchTerm("") });
  if (locationFilter !== "All") activePills.push({ key: "location", label: `Location: ${locationFilter}`, onClear: () => setLocationFilter("All") });
  if (sortMode !== "recommended") activePills.push({ key: "sort", label: sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z", onClear: () => setSortMode("recommended") });
  if (roomTypeFilter !== "Any") activePills.push({ key: "room", label: `Room: ${roomTypeFilter}`, onClear: () => setRoomTypeFilter("Any") });
  if (distanceFilter !== "Any") activePills.push({ key: "distance", label: `Distance: ${distanceFilter}`, onClear: () => setDistanceFilter("Any") });
  if (selectedAmenities.length) selectedAmenities.forEach(a => activePills.push({ key: `amenity_${a}`, label: `Amenity: ${AMENITY_OPTIONS.find(o=>o.key===a)?.label||a}`, onClear: () => toggleAmenity(a) }));
  if (priceMinStr.trim()) activePills.push({ key: "pmin", label: `Min: ${priceMinStr}`, onClear: () => setPriceMinStr("") });
  if (priceMaxStr.trim()) activePills.push({ key: "pmax", label: `Max: ${priceMaxStr}`, onClear: () => setPriceMaxStr("") });
  if (intent.nearCampus && searchTerm.trim()) activePills.push({ key: "intent_near", label: "Intent: Near campus", onClear: () => setSearchTerm(prev => prev.replace(/near campus|close to campus|ucc|campus/gi, "").trim()) });

  const filterProps = {
    uniqueLocations,
    locationFilter, setLocationFilter,
    sortMode, setSortMode,
    roomTypeFilter, setRoomTypeFilter,
    distanceFilter, setDistanceFilter,
    priceMinStr, setPriceMinStr,
    priceMaxStr, setPriceMaxStr,
    selectedAmenities, toggleAmenity,
    clearAll
  };

  // 8. Render
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
         {/* Search Header */}
         <div className="mb-8 md:mb-10">
           <div className="md:static sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 backdrop-blur border-b border-slate-100 md:border-0">
             <h1 className="text-3xl font-extrabold text-slate-900 mb-4 md:mb-6">Search Hostels</h1>
             <div className="flex flex-col md:flex-row gap-4">
               {/* Input Block */}
               <div className="relative flex-1">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search className="h-5 w-5 text-slate-400" /></div>
                 <input ref={inputRef} type="text" className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-shadow" placeholder='Try: "under 800 near campus", "self con Ayensu"' value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); setActiveSuggestion(0); }} onFocus={() => setShowSuggestions(true)} onKeyDown={(e) => {
                    if (!showSuggestions || !suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion(p => Math.min(p+1, suggestions.length-1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion(p => Math.max(p-1, 0)); }
                    if (e.key === "Enter") { e.preventDefault(); applySuggestion(suggestions[activeSuggestion]); }
                    if (e.key === "Escape") setShowSuggestions(false);
                 }}/>
                 {searchTerm.trim() && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>}
                 
                 {showSuggestions && suggestions.length > 0 && (
                   <div ref={suggestionsRef} className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl z-40">
                     {suggestions.map((s, idx) => (
                       <button key={idx} onClick={() => applySuggestion(s)} className={`w-full text-left px-4 py-3 text-sm font-extrabold ${idx === activeSuggestion ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-800"}`}>
                         {TextUtils.highlight(s, searchTerm)}
                       </button>
                     ))}
                   </div>
                 )}
               </div>
               
               {/* Mobile Filter Toggle */}
               <button onClick={() => setShowFilters(!showFilters)} className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"><SlidersHorizontal className="h-4 w-4" /> Filters</button>

               {/* Desktop Controls */}
               <div className="hidden md:flex flex-col md:flex-row gap-2 w-full md:w-auto">
                 <div className="relative min-w-[200px]">
                    <MapPin className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                    <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm">
                      {uniqueLocations.map((loc, i) => <option key={i} value={loc}>{loc === "All" ? "Any Location" : loc}</option>)}
                    </select>
                 </div>
                 <div className="relative min-w-[200px]">
                    <ArrowUpDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                    <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm">
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Lowest price</option>
                      <option value="name_az">Name A–Z</option>
                    </select>
                 </div>
               </div>
             </div>
             
             {/* Pills & Counts */}
             <div className="mt-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="text-sm font-bold text-slate-700">{loading ? "Loading..." : `${filteredItems.length} hostels found`}</div>
                {activePills.length > 0 && <button onClick={clearAll} className="text-sm font-extrabold text-slate-900 hover:text-emerald-700">Clear all</button>}
             </div>
             
             {activePills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                   {activePills.map(p => <Pill key={p.key} label={p.label} onClear={p.onClear}/>)}
                </div>
             )}
           </div>
           
           {/* EXTRACTED: Mobile Filter Drawer */}
           <MobileFilterDrawer {...filterProps} showFilters={showFilters} setShowFilters={setShowFilters} />
           
           {/* EXTRACTED: Desktop Quick Filters */}
           <DesktopFilterBar {...filterProps} />
         </div>

         {/* Results Grid */}
         <div className={`transition-opacity duration-300 ${loading||isTyping ? "opacity-60" : "opacity-100"}`}>
            {loading ? (
               <div className="grid grid-cols-1 gap-8 animate-pulse">
                  {[1,2].map(i => <div key={i} className="h-80 bg-slate-200 rounded-[2rem]"/>)}
               </div>
            ) : filteredItems.length > 0 ? (
               <div className="grid grid-cols-1 gap-8">
                  {paged.map(it => <SearchMosaicCard key={it.id} item={it} query={debouncedSearch} onOpen={()=>onNavigate("detail", it.id)}/>)}
                  {filteredItems.length > visibleCount && (
                    <div className="flex justify-center mt-8">
                      <button onClick={()=>setVisibleCount(p=>p+12)} className="rounded-xl bg-slate-900 px-6 py-3 text-white font-bold shadow-lg">Load more</button>
                    </div>
                  )}
               </div>
            ) : (
               <div className="text-center py-20">
                  <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4"><SearchX className="h-8 w-8 text-slate-400"/></div>
                  <h3 className="text-xl font-extrabold text-slate-900">No matches found</h3>
                  <button onClick={clearAll} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-white font-bold">Clear filters</button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}