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

// -------------------- Core text utils --------------------
function getStringField(obj: any, key: string) {
  return typeof obj?.[key] === "string" ? obj[key] : undefined;
}

function toText(v: any): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(toText).join(" ");
  if (v && typeof v === "object") {
    // IMPORTANT: avoid exploding huge objects
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

// -------------------- Better fuzzy matching (still lightweight) --------------------
// Tiny edit-distance for short tokens (helps typos like "amammoa" -> "amamoma")
function editDistance(a: string, b: string): number {
  const s = a || "";
  const t = b || "";
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // small DP
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

// Score 0..100 based on token hit ratio. Uses substring match, and edit-distance fallback for short tokens.
function fuzzyScore(hay: string, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;

  const hTokens = tokenize(hay);
  if (!hTokens.length) return 0;

  let hits = 0;

  for (const q of queryTokens) {
    if (q.length <= 1) continue;

    // direct substring matches first
    const direct = hTokens.some((w) => w.includes(q) || q.includes(w));
    if (direct) {
      hits += 1;
      continue;
    }

    // typo tolerance for short tokens (2..10 chars)
    if (q.length >= 2 && q.length <= 10) {
      const close = hTokens.some((w) => {
        if (w.length < 2 || w.length > 14) return false;
        const d = editDistance(w, q);
        // allow small distance relative to length
        return d <= (q.length <= 4 ? 1 : 2);
      });
      if (close) hits += 1;
    }
  }

  const ratio = hits / Math.max(1, queryTokens.length);
  return Math.round(clamp(ratio * 100, 0, 100));
}

// -------------------- Images --------------------
function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find((x) => typeof x === "string" && x);
  return found ? [found] : [];
}

// -------------------- Price extraction with unit --------------------
type PriceUnit = "month" | "semester" | "year" | "day" | "unknown";

function extractPriceWithUnit(hostel: any): { price: number | null; unit: PriceUnit } {
  // Prefer explicit fields
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

  // Generic numeric/string price with unknown unit
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

// -------------------- Amenities synonyms (fixes false negatives) --------------------
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

function matchesAmenityText(amenityTextNormalized: string, selected: string[]): boolean {
  if (!selected.length) return true;
  return selected.every((key) => {
    const syns = AMENITY_SYNONYMS[key] ?? [key];
    return syns.some((s) => amenityTextNormalized.includes(normalize(s)));
  });
}

// -------------------- Near campus (smarter heuristic + easy to extend) --------------------
// Add/extend these based on your real geography. Keeps current design; improves accuracy instantly.
const NEAR_CAMPUS_AREAS = [
  "ayensu",
  "amamoma",
  "kwaprow",
  "ape wosika",
  "new site",
  "old site",
  "kakumdo",
];

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

// -------------------- Intent parsing --------------------
type Intent = {
  queryTokens: string[];
  priceMax?: number;
  priceMin?: number;
  wantsCheap?: boolean;
  nearCampus?: boolean;
  roomTypeHints: string[];
  amenityHints: string[]; // keys (wifi/security etc.)
};

function parseIntent(raw: string): Intent {
  const q = normalize(raw);
  const tokens = tokenize(q);

  const intent: Intent = { queryTokens: tokens, roomTypeHints: [], amenityHints: [] };

  const priceMaxMatch = q.match(/(under|below|max|less than)\s+(\d{2,6})/) || q.match(/<\s*(\d{2,6})/);
  if (priceMaxMatch) {
    const n = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);
    if (Number.isFinite(n)) intent.priceMax = n;
  }

  const priceMinMatch = q.match(/(over|above|min|more than)\s+(\d{2,6})/) || q.match(/>\s*(\d{2,6})/);
  if (priceMinMatch) {
    const n = Number(priceMinMatch[2] ?? priceMinMatch[1]);
    if (Number.isFinite(n)) intent.priceMin = n;
  }

  if (tokens.includes("cheap") || tokens.includes("budget") || tokens.includes("affordable")) {
    intent.wantsCheap = true;
  }

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

  // amenity hints from query → mapped to keys
  const qNorm = q;
  for (const k of Object.keys(AMENITY_SYNONYMS)) {
    const syns = AMENITY_SYNONYMS[k] ?? [];
    if (syns.some((s) => qNorm.includes(normalize(s)))) intent.amenityHints.push(k);
  }

  // unique
  intent.amenityHints = Array.from(new Set(intent.amenityHints));

  return intent;
}

// -------------------- Stable id (fixes missing hostel.id issues) --------------------
function stableHash(input: string): string {
  // small deterministic hash (djb2-ish)
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

// -------------------- Safer highlight (no weird mismatches) --------------------
function highlight(text: string, query: string) {
  const original = String(text || "");
  const token = tokenize(query)[0];
  if (!token) return original;

  // Find in original case-insensitively
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

// -------------------- UI Bits (same design language) --------------------
function Chip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
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

// -------------------- Index build (PERFORMANCE FIX) --------------------
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

    const featuresRaw =
      h.features ??
      h.amenities ??
      h.facilities ??
      h.tags ??
      h.description ??
      h.category ??
      "";

    const roomRaw = h.room_type ?? h.roomType ?? h.type ?? h.category ?? "";
    const amenityRaw = h.amenities ?? h.features ?? h.facilities ?? h.tags ?? "";

    const nameN = normalize(name);
    const locationN = normalize(location);
    const addressN = normalize(address);
    const featuresN = normalize(toText(featuresRaw));
    const roomTypeN = normalize(toText(roomRaw));
    const amenityN = normalize(toText(amenityRaw));

    const imgs = getImageUrls(h);
    const imgCount = imgs.length;
    const hasImages = imgCount > 0 ? 1 : 0;

    const { price, unit } = extractPriceWithUnit(h);
    const hasPrice = price != null ? 1 : 0;

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
      imgCount,
      hasImages,
      price,
      priceUnit: unit,
      hasPrice,
      nearCampus,
    };
  });
}

// -------------------- Mosaic Card --------------------
function SearchMosaicCard({
  item,
  onOpen,
  query,
}: {
  item: IndexedHostel;
  onOpen: () => void;
  query: string;
}) {
  const images = getImageUrls(item.hostel);
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);
  const [a, b, c, d, e] = safeImages;

  const unitLabel = formatUnit(item.priceUnit);
  const showPriceChip = item.price != null && item.priceUnit !== "unknown"; // avoid misleading unit
  const showPriceSoft = item.price != null && item.priceUnit === "unknown"; // show, but without unit

  // Quick chips (max 4)
  const chips: string[] = [];

  if (showPriceChip) chips.push(`From ${item.price!.toLocaleString()}${unitLabel}`);
  else if (showPriceSoft) chips.push(`From ${item.price!.toLocaleString()}`);

  if (item.roomTypeN.includes("self-contained") || item.roomTypeN.includes("self con")) chips.push("Self-contained");
  else if (item.roomTypeN.includes("shared") || item.roomTypeN.includes("2 in 1") || item.roomTypeN.includes("two in one")) chips.push("Shared");
  else if (item.roomTypeN.includes("single")) chips.push("Single room");

  if (item.nearCampus) chips.push("Near campus");
  if (matchesAmenityText(item.amenityN, ["wifi"])) chips.push("Wi-Fi");
  if (matchesAmenityText(item.amenityN, ["security"]) || matchesAmenityText(item.amenityN, ["cctv"])) chips.push("Security");

  const displayChips = chips.slice(0, 4);

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform"
        type="button"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
          <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">
            {a ? (
              <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Main" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-10 w-10 text-slate-400" />
              </div>
            )}
          </div>

          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {b ? (
              <img src={b} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 1" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {c ? (
              <img src={c} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 2" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {d ? (
              <img src={d} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 3" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
          </div>

          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {e ? (
              <img src={e} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 4" />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-slate-400" />
              </div>
            )}
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
          <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors">
            {highlight(item.name, query)}
          </h3>

          <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI ranked</span>
          </div>
        </div>

        {(item.location || item.address) && (
          <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{highlight(item.location || item.address, query)}</span>
          </div>
        )}

        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayChips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------- Filters --------------------
type SortMode = "recommended" | "name_az" | "price_low";
type RoomTypeFilter = "Any" | "Self-contained" | "Single" | "Shared" | "Chamber & Hall";
type DistanceFilter = "Any" | "Near campus";

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Filters
  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>("Any");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");

  // Mobile performance pagination
  const [visibleCount, setVisibleCount] = useState(12);

  // Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Debounce typing
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
      setVisibleCount(12);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getHostels();
        const list = Array.isArray(data) ? [...data] : [];

        // Manual hostels (your existing behavior)
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
            // Example (optional): price_per_semester: 1200
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

  // Build index ONCE per hostels update (big perf win)
  const indexed = useMemo(() => buildIndex(hostels), [hostels]);

  // Clean unique locations (from indexed for consistency)
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

  // Outside click closes suggestions
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!t) return;
      if (inputRef.current && inputRef.current.contains(t)) return;
      if (suggestionsRef.current && suggestionsRef.current.contains(t)) return;
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Intent (AI-like)
  const intent = useMemo(() => parseIntent(debouncedSearch), [debouncedSearch]);

  // Price inputs override intent
  const priceMinUI = useMemo(() => safeNumberInput(priceMinStr), [priceMinStr]);
  const priceMaxUI = useMemo(() => safeNumberInput(priceMaxStr), [priceMaxStr]);

  // Suggestions: based on real data + smart templates
  const suggestions = useMemo(() => {
    const q = normalize(searchTerm);
    const templates = [
      "under 800 near campus",
      "under 1000",
      "self con Ayensu",
      "Amamoma single room",
      "wifi + security",
      "near campus",
      "shared room",
      "self-contained",
      "budget",
    ];

    const locs = uniqueLocations.filter((l) => l !== "All").slice(0, 12);

    // common tokens from dataset (lightweight)
    const featureHints: string[] = [];
    const roomHints: string[] = [];
    for (const it of indexed.slice(0, 80)) {
      if (it.roomTypeN.includes("self-contained")) roomHints.push("self-contained");
      if (it.roomTypeN.includes("shared") || it.roomTypeN.includes("2 in 1")) roomHints.push("shared room");
      if (it.roomTypeN.includes("single")) roomHints.push("single room");
      if (it.amenityN.includes("wifi") || it.amenityN.includes("internet")) featureHints.push("wifi");
      if (it.amenityN.includes("security") || it.amenityN.includes("guard")) featureHints.push("security");
      if (it.amenityN.includes("generator") || it.amenityN.includes("backup")) featureHints.push("generator");
    }

    const merged = Array.from(
      new Set([
        ...templates,
        ...locs,
        ...Array.from(new Set(roomHints)).slice(0, 4),
        ...Array.from(new Set(featureHints)).slice(0, 4),
      ])
    );

    if (!q) return merged.slice(0, 10);

    const qTokens = tokenize(q);
    return merged
      .map((s) => ({ s, score: fuzzyScore(s, qTokens) }))
      .filter((x) => x.score > 0 || normalize(x.s).includes(q))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
      .slice(0, 10);
  }, [searchTerm, uniqueLocations, indexed]);

  const applySuggestion = (s: string) => {
    setSearchTerm(s);
    setShowSuggestions(false);
    setActiveSuggestion(0);
    inputRef.current?.focus();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Escape") setShowSuggestions(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      applySuggestion(suggestions[activeSuggestion] ?? searchTerm);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    setVisibleCount(12);
  };

  // -------------------- Main filtering + ranking (FAST, uses index) --------------------
  const scored = useMemo(() => {
    const locFilterNorm = normalize(locationFilter === "All" ? "" : locationFilter);

    const roomTypeNeedles =
      roomTypeFilter === "Any"
        ? []
        : roomTypeFilter === "Self-contained"
          ? ["self-contained", "self con", "selfcontained"]
          : roomTypeFilter === "Single"
            ? ["single"]
            : roomTypeFilter === "Shared"
              ? ["shared", "2 in 1", "two in one"]
              : ["chamber", "hall", "chamber & hall"];

    const wantNear = distanceFilter === "Near campus";

    const priceMin = priceMinUI ?? intent.priceMin;
    const priceMax = priceMaxUI ?? intent.priceMax;

    // Merge amenities: explicit selection + inferred intent (from query)
    const amenityKeys = Array.from(new Set([...selectedAmenities, ...intent.amenityHints]));

    const qTokens = intent.queryTokens;

    const results = indexed
      .map((it) => {
        // Location dropdown (case-insensitive)
        const matchesLocation =
          locationFilter === "All" ||
          (!!locFilterNorm && (it.locationN.includes(locFilterNorm) || it.addressN.includes(locFilterNorm)));

        // Distance
        const matchesDistance = wantNear ? it.nearCampus : true;

        // Room type
        const matchesRoom = roomTypeNeedles.length ? roomTypeNeedles.some((n) => it.roomTypeN.includes(normalize(n))) : true;

        // Amenities (synonyms)
        const matchesAmenities = matchesAmenityText(it.amenityN, amenityKeys);

        // Price
        const matchesPriceMin = priceMin == null || it.price == null ? true : it.price >= priceMin;
        const matchesPriceMax = priceMax == null || it.price == null ? true : it.price <= priceMax;

        // Fuzzy relevance
        const sName = fuzzyScore(it.nameN, qTokens);
        const sLoc = fuzzyScore(it.locationN, qTokens);
        const sAddr = fuzzyScore(it.addressN, qTokens);
        const sFeat = fuzzyScore(it.featuresN, qTokens);

        const hasQuery = qTokens.length > 0;
        const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;

        // Query gate: if user typed something, allow either fuzzy hits or strong faceted filters
        const passesQueryGate =
          !hasQuery ||
          anyFuzzyHit ||
          amenityKeys.length > 0 ||
          roomTypeNeedles.length > 0 ||
          priceMin != null ||
          priceMax != null ||
          wantNear;

        const passesAll =
          matchesLocation &&
          matchesDistance &&
          matchesRoom &&
          matchesAmenities &&
          matchesPriceMin &&
          matchesPriceMax &&
          passesQueryGate;

        // Relevance score (weighted, plus completeness)
        let score =
          sName * 3 +
          sLoc * 2 +
          sAddr * 1 +
          sFeat * 1 +
          it.hasImages * 60 +
          it.hasPrice * 40;

        // If empty query: prioritize complete listings
        if (!qTokens.length) score = it.hasImages * 60 + it.hasPrice * 40;

        // Intent boosts (kept gentle so it never feels “random”)
        if (intent.nearCampus && it.nearCampus) score += 80;
        if (intent.wantsCheap && it.price != null) score += Math.max(0, 8000 - it.price) / 50;

        // Facet boosts (so filtered items feel “correct” at the top)
        if (wantNear && it.nearCampus) score += 60;
        if (roomTypeNeedles.length && matchesRoom) score += 40;
        if (amenityKeys.length && matchesAmenities) score += 30;

        return { it, score, passesAll };
      })
      .filter((x) => x.passesAll);

    // Sorting
    const sorted = results.sort((a, b) => {
      if (sortMode === "name_az") return a.it.nameN.localeCompare(b.it.nameN);
      if (sortMode === "price_low") {
        const ap = a.it.price ?? Number.POSITIVE_INFINITY;
        const bp = b.it.price ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return b.score - a.score;
      }
      return b.score - a.score; // recommended
    });

    return sorted;
  }, [
    indexed,
    intent,
    locationFilter,
    roomTypeFilter,
    distanceFilter,
    selectedAmenities,
    priceMinUI,
    priceMaxUI,
    sortMode,
  ]);

  const filteredItems = useMemo(() => scored.map((x) => x.it), [scored]);

  // Pagination slice
  const paged = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  // Pills
  const activePills = useMemo(() => {
    const pills: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (searchTerm.trim()) pills.push({ key: "search", label: `Search: ${searchTerm.trim()}`, onClear: () => setSearchTerm("") });
    if (locationFilter !== "All") pills.push({ key: "location", label: `Location: ${locationFilter}`, onClear: () => setLocationFilter("All") });
    if (sortMode !== "recommended") pills.push({ key: "sort", label: sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z", onClear: () => setSortMode("recommended") });

    if (roomTypeFilter !== "Any") pills.push({ key: "room", label: `Room: ${roomTypeFilter}`, onClear: () => setRoomTypeFilter("Any") });
    if (distanceFilter !== "Any") pills.push({ key: "distance", label: `Distance: ${distanceFilter}`, onClear: () => setDistanceFilter("Any") });

    if (selectedAmenities.length) {
      selectedAmenities.forEach((a) => {
        const label = AMENITY_OPTIONS.find((x) => x.key === a)?.label ?? a;
        pills.push({ key: `amenity_${a}`, label: `Amenity: ${label}`, onClear: () => setSelectedAmenities((prev) => prev.filter((x) => x !== a)) });
      });
    }

    if (priceMinStr.trim()) pills.push({ key: "pmin", label: `Min: ${priceMinStr.trim()}`, onClear: () => setPriceMinStr("") });
    if (priceMaxStr.trim()) pills.push({ key: "pmax", label: `Max: ${priceMaxStr.trim()}`, onClear: () => setPriceMaxStr("") });

    // Intent pill for near campus if user typed it
    if (intent.nearCampus && searchTerm.trim()) {
      pills.push({
        key: "intent_near",
        label: "Intent: Near campus",
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
  }, [
    searchTerm,
    locationFilter,
    sortMode,
    roomTypeFilter,
    distanceFilter,
    selectedAmenities,
    priceMinStr,
    priceMaxStr,
    intent.nearCampus,
  ]);

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

  // Smooth transitions while typing/loading
  const showResultsFade = loading || isTyping;

  // Mobile drawer motion
  const filtersOpen = showFilters;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Sticky mobile-first search zone */}
        <div className="mb-8 md:mb-10">
          <div className="md:static sticky top-0 z-30 -mx-4 px-4 pt-4 pb-4 bg-slate-50/90 backdrop-blur border-b border-slate-100 md:border-0">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-4 md:mb-6">Search Hostels</h1>

            <div className="flex flex-col md:flex-row gap-4">
              {/* Search input + autocomplete */}
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>

                <input
                  ref={inputRef}
                  type="text"
                  className="block w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-shadow"
                  placeholder='Try: "under 800 near campus", "self con Ayensu", "wifi + security"'
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setActiveSuggestion(0);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={onInputKeyDown}
                />

                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100 transition"
                    title="Clear"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}

                <div className={`mt-2 text-xs font-extrabold ${isTyping ? "text-emerald-600" : "text-slate-400"} transition-colors`}>
                  {isTyping ? "Searching…" : ""}
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl shadow-slate-200 z-40"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="text-xs font-extrabold text-slate-700">Suggestions</div>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-xs font-extrabold text-slate-600 hover:text-slate-900 transition"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      {suggestions.map((s, idx) => (
                        <button
                          key={`${s}-${idx}`}
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className={[
                            "w-full text-left px-4 py-3 text-sm font-extrabold transition",
                            idx === activeSuggestion ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-800",
                          ].join(" ")}
                          onMouseEnter={() => setActiveSuggestion(idx)}
                        >
                          {highlight(s, searchTerm)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter + Sort row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="md:hidden inline-flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm active:scale-[0.99] transition-transform"
                  type="button"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>

                {/* Desktop compact controls */}
                <div className="hidden md:flex flex-col md:flex-row gap-2 w-full md:w-auto">
                  {/* Location */}
                  <div className="relative min-w-[200px]">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={locationFilter}
                      onChange={(e) => {
                        setLocationFilter(e.target.value);
                        setVisibleCount(12);
                      }}
                      className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                      {uniqueLocations.map((loc, i) => (
                        <option key={i} value={loc}>
                          {loc === "All" ? "Any Location" : loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div className="relative min-w-[210px]">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={sortMode}
                      onChange={(e) => {
                        setSortMode(e.target.value as SortMode);
                        setVisibleCount(12);
                      }}
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

            {/* Result count + clear all */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-700">
                {loading ? "Loading hostels…" : `${filteredItems.length.toLocaleString()} hostels found`}
              </div>

              {activePills.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-sm font-extrabold text-slate-900 hover:text-emerald-700 transition-colors"
                  type="button"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Active pills */}
            {activePills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {activePills.map((p) => (
                  <Pill key={p.key} label={p.label} onClear={p.onClear} />
                ))}
              </div>
            )}

            {/* Mobile filter drawer */}
            <div
              className={[
                "md:hidden mt-4 overflow-hidden transition-all duration-300 ease-out",
                filtersOpen ? "max-h-[900px] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2",
              ].join(" ")}
            >
              <div className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold text-slate-900 inline-flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="text-sm font-extrabold text-slate-700 hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>

                {/* Location */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Location</div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={locationFilter}
                      onChange={(e) => {
                        setLocationFilter(e.target.value);
                        setVisibleCount(12);
                      }}
                      className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                      {uniqueLocations.map((loc, i) => (
                        <option key={i} value={loc}>
                          {loc === "All" ? "Any Location" : loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Sort</div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                    <select
                      value={sortMode}
                      onChange={(e) => {
                        setSortMode(e.target.value as SortMode);
                        setVisibleCount(12);
                      }}
                      className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-10 pr-8 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="price_low">Lowest price</option>
                      <option value="name_az">Name A–Z</option>
                    </select>
                  </div>
                </div>

                {/* Room type */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Room type</div>
                  <div className="relative">
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={roomTypeFilter}
                      onChange={(e) => {
                        setRoomTypeFilter(e.target.value as RoomTypeFilter);
                        setVisibleCount(12);
                      }}
                      className="block w-full appearance-none rounded-2xl border-2 border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-bold text-slate-700 focus:border-emerald-500 focus:outline-none shadow-sm"
                    >
                      <option value="Any">Any</option>
                      <option value="Self-contained">Self-contained</option>
                      <option value="Single">Single</option>
                      <option value="Shared">Shared</option>
                      <option value="Chamber & Hall">Chamber & Hall</option>
                    </select>
                  </div>
                </div>

                {/* Distance */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Distance</div>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      label="Any"
                      active={distanceFilter === "Any"}
                      onClick={() => {
                        setDistanceFilter("Any");
                        setVisibleCount(12);
                      }}
                    />
                    <Chip
                      label="Near campus"
                      active={distanceFilter === "Near campus"}
                      onClick={() => {
                        setDistanceFilter("Near campus");
                        setVisibleCount(12);
                      }}
                      icon={<MapPin className="h-4 w-4" />}
                    />
                  </div>
                </div>

                {/* Price range */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Price range</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={priceMinStr}
                      onChange={(e) => {
                        setPriceMinStr(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder="Min (e.g. 500)"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
                    />
                    <input
                      value={priceMaxStr}
                      onChange={(e) => {
                        setPriceMaxStr(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder="Max (e.g. 1200)"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
                    />
                  </div>
                  <div className="mt-2 text-xs font-bold text-slate-500">Tip: You can also type “under 800” in search.</div>
                </div>

                {/* Amenities */}
                <div className="mt-4">
                  <div className="text-xs font-extrabold text-slate-600 mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map((a) => (
                      <Chip
                        key={a.key}
                        label={a.label}
                        active={selectedAmenities.includes(a.key)}
                        onClick={() => toggleAmenity(a.key)}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={clearAll}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 hover:shadow-xl active:scale-[0.99]"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 active:scale-[0.99]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop “quick filters” bar (kept, but lightweight) */}
            <div className="hidden md:block mt-5">
              <div className="rounded-[1.5rem] border-2 border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="text-xs font-extrabold text-slate-600 mr-2">Quick filters</div>

                  <Chip
                    label="Near campus"
                    active={distanceFilter === "Near campus"}
                    onClick={() => {
                      setDistanceFilter(distanceFilter === "Near campus" ? "Any" : "Near campus");
                      setVisibleCount(12);
                    }}
                    icon={<MapPin className="h-4 w-4" />}
                  />

                  <Chip
                    label="Self-contained"
                    active={roomTypeFilter === "Self-contained"}
                    onClick={() => {
                      setRoomTypeFilter(roomTypeFilter === "Self-contained" ? "Any" : "Self-contained");
                      setVisibleCount(12);
                    }}
                  />

                  <Chip
                    label="Shared"
                    active={roomTypeFilter === "Shared"}
                    onClick={() => {
                      setRoomTypeFilter(roomTypeFilter === "Shared" ? "Any" : "Shared");
                      setVisibleCount(12);
                    }}
                  />

                  <Chip label="Wi-Fi" active={selectedAmenities.includes("wifi")} onClick={() => toggleAmenity("wifi")} />
                  <Chip label="Security" active={selectedAmenities.includes("security")} onClick={() => toggleAmenity("security")} />

                  <div className="ml-auto flex items-center gap-2">
                    <input
                      value={priceMinStr}
                      onChange={(e) => {
                        setPriceMinStr(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder="Min"
                      className="w-28 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
                    />
                    <input
                      value={priceMaxStr}
                      onChange={(e) => {
                        setPriceMaxStr(e.target.value);
                        setVisibleCount(12);
                      }}
                      placeholder="Max"
                      className="w-28 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-sm"
                    />
                    <div className="text-xs font-extrabold text-slate-500">Price</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={`transition-opacity duration-300 ${showResultsFade ? "opacity-60" : "opacity-100"}`}>
          {loading ? (
            <div className="grid grid-cols-1 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[2rem] border-2 border-slate-200 bg-white p-4 animate-pulse">
                  <div className="h-80 w-full bg-slate-100 rounded-[1.5rem] mb-4" />
                  <div className="h-6 w-1/3 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-1/4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-8">
                {paged.map((it) => (
                  <SearchMosaicCard
                    key={it.id}
                    item={it}
                    query={debouncedSearch}
                    onOpen={() => onNavigate("detail", it.id)}
                  />
                ))}
              </div>

              {filteredItems.length > visibleCount && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((p) => p + 12)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 hover:shadow-xl active:scale-[0.99]"
                  >
                    Load more
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
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
                {["Ayensu", "Amamoma", "under 800", "near campus", "self con", "wifi + security"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSearchTerm(s)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition"
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <button
                onClick={clearAll}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
                type="button"
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
