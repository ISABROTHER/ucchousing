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
  Check,
  Filter,
  ChevronDown,
} from "lucide-react";
import { getHostels } from "../lib/hostels";
import { PageType } from "../App";

interface SearchPageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type Hostel = any;

// ============================================================================
// 1. HELPER FUNCTIONS (Pure Logic, Single Task)
// ============================================================================

function getStringField(obj: any, key: string) {
  return typeof obj?.[key] === "string" ? obj[key] : undefined;
}

function toText(v: any): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(toText).join(" ");
  if (v && typeof v === "object") {
    const vals = Object.values(v);
    return vals.slice(0, 30).map(toText).join(" ");
  }
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

function safeNumberInput(v: string): number | null {
  const s = (v || "").replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

// --- Fuzzy Matching Helpers ---
function editDistance(a: string, b: string): number {
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
}

function fuzzyScore(hay: string, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const hTokens = tokenize(hay);
  if (!hTokens.length) return 0;
  let hits = 0;

  for (const q of queryTokens) {
    if (q.length <= 1) continue;
    const direct = hTokens.some((w) => w.includes(q) || q.includes(w));
    if (direct) {
      hits += 1;
      continue;
    }
    if (q.length >= 2 && q.length <= 10) {
      const close = hTokens.some((w) => {
        if (w.length < 2 || w.length > 14) return false;
        const d = editDistance(w, q);
        return d <= (q.length <= 4 ? 1 : 2);
      });
      if (close) hits += 1;
    }
  }
  const ratio = hits / Math.max(1, queryTokens.length);
  return Math.round(clamp(ratio * 100, 0, 100));
}

// --- Image & Price Helpers ---
function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find((x) => typeof x === "string" && x);
  return found ? [found] : [];
}

type PriceUnit = "month" | "semester" | "year" | "day" | "unknown";
function extractPriceWithUnit(hostel: any): { price: number | null; unit: PriceUnit } {
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
  const candidates = [hostel.price, hostel.price_from, hostel.min_price];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return { price: c, unit: "unknown" };
    if (typeof c === "string") {
      const m = c.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
      if (m) return { price: Number(m[1]), unit: "unknown" };
    }
  }
  return { price: null, unit: "unknown" };
}

function formatUnit(unit: PriceUnit): string {
  if (unit === "month") return "/mo";
  if (unit === "semester") return "/sem";
  if (unit === "year") return "/yr";
  if (unit === "day") return "/day";
  return "";
}

// --- ID Helper ---
function stableHash(input: string): string {
  let h = 5381;
  const s = input || "";
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

function getStableId(hostel: any): string {
  const id = hostel?.id ?? hostel?.uuid ?? hostel?.slug;
  if (typeof id === "string" && id.trim()) return id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  const name = getStringField(hostel, "name") || "";
  const loc = getStringField(hostel, "location") || getStringField(hostel, "address") || "";
  return `hostel_${stableHash(normalize(`${name}|${loc}`))}`;
}

// --- Highlighting ---
function highlight(text: string, query: string) {
  const original = String(text || "");
  const token = tokenize(query)[0];
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

// ============================================================================
// 2. CONSTANTS & CONFIG
// ============================================================================

const AMENITY_SYNONYMS: Record<string, string[]> = {
  wifi: ["wifi", "wi-fi", "internet", "wireless", "hotspot"],
  water: ["water", "running water", "pipe borne", "pipe-borne"],
  security: ["security", "guard", "security man", "watchman", "gated", "secure"],
  cctv: ["cctv", "camera", "surveillance"],
  generator: ["generator", "backup", "power backup", "light backup", "inverter"],
  kitchen: ["kitchen", "shared kitchen", "kitchenette", "cooking"],
  laundry: ["laundry", "washing", "washing area", "washing machine"],
  ac: ["ac", "aircon", "air con", "air-condition", "air conditioning"],
};

const AMENITY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "water", label: "Water" },
  { key: "security", label: "Security" },
  { key: "cctv", label: "CCTV" },
  { key: "generator", label: "Generator" },
  { key: "kitchen", label: "Kitchen" },
  { key: "laundry", label: "Laundry" },
  { key: "ac", label: "AC" },
];

const NEAR_CAMPUS_AREAS = ["ayensu", "amamoma", "kwaprow", "ape wosika", "new site", "old site", "kakumdo"];

// ============================================================================
// 3. LOGIC MODULES (Separated Concerns)
// ============================================================================

function matchesAmenityText(amenityTextNormalized: string, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.every((key) => {
    const syns = AMENITY_SYNONYMS[key] ?? [key];
    return syns.some((s) => amenityTextNormalized.includes(normalize(s)));
  });
}

function isNearCampusFromIndex(locationNorm: string, addressNorm: string, featuresNorm: string): boolean {
  const combined = `${locationNorm} ${addressNorm} ${featuresNorm}`;
  if (
    combined.includes("on campus") ||
    combined.includes("near campus") ||
    combined.includes("close to campus") ||
    combined.includes("ucc") ||
    combined.includes("campus")
  ) return true;
  return NEAR_CAMPUS_AREAS.some((a) => combined.includes(a));
}

type Intent = {
  queryTokens: string[];
  priceMax?: number;
  priceMin?: number;
  wantsCheap?: boolean;
  nearCampus?: boolean;
  roomTypeHints: string[];
  amenityHints: string[];
};

function parseIntent(raw: string): Intent {
  const q = normalize(raw);
  const tokens = tokenize(q);
  const intent: Intent = { queryTokens: tokens, roomTypeHints: [], amenityHints: [] };

  const priceMaxMatch = q.match(/(under|below|max|less than)\s+(\d{2,6})/) || q.match(/<\s*(\d{2,6})/);
  if (priceMaxMatch) intent.priceMax = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);

  const priceMinMatch = q.match(/(over|above|min|more than)\s+(\d{2,6})/) || q.match(/>\s*(\d{2,6})/);
  if (priceMinMatch) intent.priceMin = Number(priceMinMatch[2] ?? priceMinMatch[1]);

  if (tokens.some(t => ["cheap", "budget", "affordable"].includes(t))) intent.wantsCheap = true;
  if (q.includes("near campus") || tokens.includes("ucc") || tokens.includes("campus")) intent.nearCampus = true;

  const roomTypeMap: Array<[string[], string]> = [
    [["self", "con"], "self-contained"],
    [["self-contained"], "self-contained"],
    [["single"], "single"],
    [["shared"], "shared"],
    [["2", "in", "1"], "shared"],
    [["chamber", "hall"], "chamber & hall"],
  ];
  for (const [keys, label] of roomTypeMap) {
    if (keys.every((k) => tokens.includes(k)) && !intent.roomTypeHints.includes(label)) {
      intent.roomTypeHints.push(label);
    }
  }

  for (const k of Object.keys(AMENITY_SYNONYMS)) {
    if (AMENITY_SYNONYMS[k].some((s) => q.includes(normalize(s)))) intent.amenityHints.push(k);
  }
  intent.amenityHints = Array.from(new Set(intent.amenityHints));
  return intent;
}

// --- Indexing (Preparing Data) ---
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

function buildIndex(hostels: any[]): IndexedHostel[] {
  return hostels.map((h) => {
    const id = getStableId(h);
    const name = getStringField(h, "name") || "Hostel";
    const location = getStringField(h, "location") || "";
    const address = getStringField(h, "address") || "";
    const featuresRaw = h.features ?? h.amenities ?? h.facilities ?? h.tags ?? h.description ?? "";
    const roomRaw = h.room_type ?? h.roomType ?? h.type ?? "";
    const amenityRaw = h.amenities ?? h.features ?? "";

    const nameN = normalize(name);
    const locationN = normalize(location);
    const addressN = normalize(address);
    const featuresN = normalize(toText(featuresRaw));
    const roomTypeN = normalize(toText(roomRaw));
    const amenityN = normalize(toText(amenityRaw));

    const imgs = getImageUrls(h);
    const { price, unit } = extractPriceWithUnit(h);
    const nearCampus = isNearCampusFromIndex(locationN, addressN, featuresN);

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
      nearCampus,
    };
  });
}

// ============================================================================
// 4. CUSTOM HOOKS (The "Reusable Logic" Layer)
// ============================================================================

function useHostelData() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getHostels();
        const list = Array.isArray(data) ? [...data] : [];
        
        // Manual Data injection
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
        const existingNames = new Set(list.map((h: any) => (h.name ? String(h.name).toLowerCase() : "")));
        manualHostels.forEach((m) => {
          if (!existingNames.has(m.name.toLowerCase())) list.push(m);
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

  // Indexing derived from data
  const indexed = useMemo(() => buildIndex(hostels), [hostels]);
  
  // Unique Locations derived from index
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

  return { hostels, indexed, uniqueLocations, loading };
}

// -------------------- MAIN SEARCH HOOK --------------------
type SortMode = "recommended" | "name_az" | "price_low";
type RoomTypeFilter = "Any" | "Self-contained" | "Single" | "Shared" | "Chamber & Hall";
type DistanceFilter = "Any" | "Near campus";

function useHostelSearch(indexed: IndexedHostel[]) {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [locationFilter, setLocationFilter] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>("Any");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  // Debouncing
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
      setVisibleCount(12);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Derived Logic
  const intent = useMemo(() => parseIntent(debouncedSearch), [debouncedSearch]);
  const priceMinUI = useMemo(() => safeNumberInput(priceMinStr), [priceMinStr]);
  const priceMaxUI = useMemo(() => safeNumberInput(priceMaxStr), [priceMaxStr]);

  const filteredItems = useMemo(() => {
    const locFilterNorm = normalize(locationFilter === "All" ? "" : locationFilter);
    const wantNear = distanceFilter === "Near campus";
    const priceMin = priceMinUI ?? intent.priceMin;
    const priceMax = priceMaxUI ?? intent.priceMax;
    const amenityKeys = Array.from(new Set([...selectedAmenities, ...intent.amenityHints]));
    const qTokens = intent.queryTokens;

    // Resolve room type keywords
    let roomNeedles: string[] = [];
    if (roomTypeFilter !== "Any") {
      if (roomTypeFilter === "Self-contained") roomNeedles = ["self-contained", "self con"];
      else if (roomTypeFilter === "Single") roomNeedles = ["single"];
      else if (roomTypeFilter === "Shared") roomNeedles = ["shared", "2 in 1", "two in one"];
      else roomNeedles = ["chamber", "hall"];
    }

    const scored = indexed.map((it) => {
      const matchesLocation = locationFilter === "All" || (!!locFilterNorm && (it.locationN.includes(locFilterNorm) || it.addressN.includes(locFilterNorm)));
      const matchesDistance = wantNear ? it.nearCampus : true;
      const matchesRoom = roomNeedles.length ? roomNeedles.some((n) => it.roomTypeN.includes(normalize(n))) : true;
      const matchesAmenities = matchesAmenityText(it.amenityN, amenityKeys);
      const matchesPriceMin = priceMin == null || it.price == null ? true : it.price >= priceMin;
      const matchesPriceMax = priceMax == null || it.price == null ? true : it.price <= priceMax;

      const sName = fuzzyScore(it.nameN, qTokens);
      const sLoc = fuzzyScore(it.locationN, qTokens);
      const sAddr = fuzzyScore(it.addressN, qTokens);
      const sFeat = fuzzyScore(it.featuresN, qTokens);
      const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;
      const hasQuery = qTokens.length > 0;

      const passesQueryGate = !hasQuery || anyFuzzyHit || amenityKeys.length > 0 || roomNeedles.length > 0 || priceMin != null || priceMax != null || wantNear;
      const passesAll = matchesLocation && matchesDistance && matchesRoom && matchesAmenities && matchesPriceMin && matchesPriceMax && passesQueryGate;

      let score = sName * 3 + sLoc * 2 + sAddr * 1 + sFeat * 1 + it.hasImages * 60 + it.hasPrice * 40;
      if (!qTokens.length) score = it.hasImages * 60 + it.hasPrice * 40;
      if (intent.nearCampus && it.nearCampus) score += 80;
      if (intent.wantsCheap && it.price != null) score += Math.max(0, 8000 - it.price) / 50;
      if (wantNear && it.nearCampus) score += 60;
      if (roomNeedles.length && matchesRoom) score += 40;

      return { it, score, passesAll };
    }).filter(x => x.passesAll);

    // Sort
    scored.sort((a, b) => {
      if (sortMode === "name_az") return a.it.nameN.localeCompare(b.it.nameN);
      if (sortMode === "price_low") {
        const ap = a.it.price ?? Infinity;
        const bp = b.it.price ?? Infinity;
        if (ap !== bp) return ap - bp;
      }
      return b.score - a.score;
    });

    return scored.map(x => x.it);
  }, [indexed, intent, locationFilter, roomTypeFilter, distanceFilter, selectedAmenities, priceMinUI, priceMaxUI, sortMode]);

  const paged = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  
  const clearAll = () => {
    setSearchTerm("");
    setLocationFilter("All");
    setSortMode("recommended");
    setRoomTypeFilter("Any");
    setDistanceFilter("Any");
    setSelectedAmenities([]);
    setPriceMinStr("");
    setPriceMaxStr("");
    setVisibleCount(12);
  };

  return {
    // State
    searchTerm, setSearchTerm, debouncedSearch, isTyping,
    locationFilter, setLocationFilter,
    sortMode, setSortMode,
    roomTypeFilter, setRoomTypeFilter,
    distanceFilter, setDistanceFilter,
    selectedAmenities, setSelectedAmenities,
    priceMinStr, setPriceMinStr,
    priceMaxStr, setPriceMaxStr,
    visibleCount, setVisibleCount,
    // Results
    filteredItems, paged,
    // Actions
    clearAll,
    // Helpers
    intent
  };
}

// ============================================================================
// 5. PRESENTATIONAL COMPONENTS (Dumb Components)
// ============================================================================

function Chip({ label, active, onClick, icon }: { label: string; active?: boolean; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold shadow-sm transition active:scale-[0.99] ${active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700"}`}
      type="button"
    >
      {icon}
      <span className="truncate max-w-[180px]">{label}</span>
      {active ? <Check className="h-4 w-4" /> : null}
    </button>
  );
}

function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button onClick={onClear} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition" type="button">
      <span className="max-w-[240px] truncate">{label}</span>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700"><X className="h-3.5 w-3.5" /></span>
    </button>
  );
}

function SearchMosaicCard({ item, onOpen, query }: { item: IndexedHostel; onOpen: () => void; query: string }) {
  const images = getImageUrls(item.hostel);
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);
  const [a, b, c, d, e] = safeImages;
  const unitLabel = formatUnit(item.priceUnit);
  
  const chips: string[] = [];
  if (item.price != null) chips.push(`From ${item.price.toLocaleString()}${item.priceUnit !== "unknown" ? unitLabel : ""}`);
  if (item.roomTypeN.includes("self-contained")) chips.push("Self-contained");
  else if (item.roomTypeN.includes("shared")) chips.push("Shared");
  else if (item.roomTypeN.includes("single")) chips.push("Single room");
  if (item.nearCampus) chips.push("Near campus");
  if (matchesAmenityText(item.amenityN, ["wifi"])) chips.push("Wi-Fi");
  
  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      <button onClick={onOpen} className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
          <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">{a ? <img src={a} className="h-full w-full object-cover" alt="Main" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-400" /></div>}</div>
          {[b, c, d, e].map((img, i) => (
            <div key={i} className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">{img ? <img src={img} className="h-full w-full object-cover" alt={`Detail ${i}`} /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}</div>
          ))}
        </div>
      </button>
      <div className="px-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">{highlight(item.name, query)}</h3>
          <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700"><Sparkles className="h-3.5 w-3.5" /><span>AI ranked</span></div>
        </div>
        {(item.location || item.address) && (
          <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium"><MapPin className="h-4 w-4 text-slate-400" /><span>{highlight(item.location || item.address, query)}</span></div>
        )}
        {chips.slice(0, 4).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">{chips.slice(0, 4).map((c) => <span key={c} className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700">{c}</span>)}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 6. MAIN PAGE COMPONENT (The Orchestrator)
// ============================================================================

export default function SearchPage({ onNavigate }: SearchPageProps) {
  // 1. Fetch Data
  const { indexed, uniqueLocations, loading } = useHostelData();

  // 2. Init Search Logic (The "Brain")
  const search = useHostelSearch(indexed);

  // 3. UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // -- Active Pills Logic (UI Concern) --
  const activePills = useMemo(() => {
    const pills: Array<{ key: string; label: string; onClear: () => void }> = [];
    if (search.searchTerm.trim()) pills.push({ key: "search", label: `Search: ${search.searchTerm.trim()}`, onClear: () => search.setSearchTerm("") });
    if (search.locationFilter !== "All") pills.push({ key: "location", label: `Location: ${search.locationFilter}`, onClear: () => search.setLocationFilter("All") });
    if (search.roomTypeFilter !== "Any") pills.push({ key: "room", label: `Room: ${search.roomTypeFilter}`, onClear: () => search.setRoomTypeFilter("Any") });
    if (search.distanceFilter !== "Any") pills.push({ key: "distance", label: `Distance: ${search.distanceFilter}`, onClear: () => search.setDistanceFilter("Any") });
    search.selectedAmenities.forEach(a => pills.push({ key: `amenity_${a}`, label: `Amenity: ${a}`, onClear: () => search.setSelectedAmenities(p => p.filter(x => x !== a)) }));
    return pills;
  }, [search.searchTerm, search.locationFilter, search.roomTypeFilter, search.distanceFilter, search.selectedAmenities]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        
        {/* --- Top Search Area --- */}
        <div className="mb-8 md:mb-10">
          <div className="md:static sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 backdrop-blur border-b border-slate-100 md:border-0">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 md:mb-6">Search Hostels</h1>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                  placeholder='Try: "under 800 near campus", "self con"'
                  value={search.searchTerm}
                  onChange={(e) => { search.setSearchTerm(e.target.value); setShowSuggestions(true); }}
                />
                {search.searchTerm && <button onClick={() => search.setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-slate-500" /></button>}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowFilters(!showFilters)} className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>
                <div className="hidden md:flex gap-2">
                  <div className="relative min-w-[200px]">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select value={search.locationFilter} onChange={(e) => search.setLocationFilter(e.target.value)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:outline-none">
                      {uniqueLocations.map((loc, i) => <option key={i} value={loc}>{loc === "All" ? "Any Location" : loc}</option>)}
                    </select>
                  </div>
                  <div className="relative min-w-[210px]">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select value={search.sortMode} onChange={(e) => search.setSortMode(e.target.value as SortMode)} className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:outline-none">
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Lowest price</option>
                      <option value="name_az">Name A–Z</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {activePills.map(p => <Pill key={p.key} label={p.label} onClear={p.onClear} />)}
              {activePills.length > 0 && <button onClick={search.clearAll} className="text-sm font-extrabold text-slate-900 hover:text-emerald-700">Clear all</button>}
            </div>

            {/* Mobile Drawer (Condensed) */}
            <div className={`md:hidden mt-4 overflow-hidden transition-all duration-300 ${showFilters ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0"}`}>
               <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 space-y-4">
                  <div>
                    <div className="text-xs font-bold mb-2">Location</div>
                    <select value={search.locationFilter} onChange={(e) => search.setLocationFilter(e.target.value)} className="w-full p-2 border rounded-xl">{uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}</select>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-2">Room Type</div>
                    <select value={search.roomTypeFilter} onChange={(e) => search.setRoomTypeFilter(e.target.value as any)} className="w-full p-2 border rounded-xl"><option value="Any">Any</option><option value="Self-contained">Self-contained</option><option value="Single">Single</option><option value="Shared">Shared</option></select>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={search.clearAll} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-sm font-bold">Clear All</button>
                     <button onClick={() => setShowFilters(false)} className="flex-1 border-2 py-2 rounded-xl text-sm font-bold">Apply</button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* --- Results --- */}
        <div className={`transition-opacity duration-300 ${loading || search.isTyping ? "opacity-60" : "opacity-100"}`}>
          {loading ? (
             <div className="grid grid-cols-1 gap-8">{[1, 2].map(i => <div key={i} className="h-80 bg-slate-200 rounded-[2rem] animate-pulse" />)}</div>
          ) : search.filteredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-8">
                {search.paged.map(it => <SearchMosaicCard key={it.id} item={it} query={search.debouncedSearch} onOpen={() => onNavigate("detail", it.id)} />)}
              </div>
              {search.filteredItems.length > search.visibleCount && (
                <div className="mt-10 flex justify-center">
                  <button onClick={() => search.setVisibleCount(p => p + 12)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg">Load more</button>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <SearchX className="h-10 w-10 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-extrabold text-slate-900">No hostels found</h3>
              <button onClick={search.clearAll} className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold">Clear filters</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}