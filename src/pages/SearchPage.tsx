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
  BedDouble,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getAllHostelsRepository } from "../lib/hostels";
import { PageType } from "../App";
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
  },
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
      const direct = hTokens.some((w) => w.includes(q) || q.includes(w));
      if (direct) {
        hits += 1;
        continue;
      }
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
  },
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
      amenityHints: [] as string[],
    };

    const priceMaxMatch = q.match(/(under|below|max|less than)\s+(\d{2,6})/) || q.match(/<\s*(\d{2,6})/);
    if (priceMaxMatch) intent.priceMax = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);

    const priceMinMatch = q.match(/(over|above|min|more than)\s+(\d{2,6})/) || q.match(/>\s*(\d{2,6})/);
    if (priceMinMatch) intent.priceMin = Number(priceMinMatch[2] ?? priceMinMatch[1]);

    if (tokens.includes("cheap") || tokens.includes("budget") || tokens.includes("affordable")) {
      intent.wantsCheap = true;
    }

    if (q.match(/near campus|close to campus|on campus|ucc|campus/)) {
      intent.nearCampus = true;
    }

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

    for (const k of Object.keys(this.AMENITY_SYNONYMS)) {
      const syns = this.AMENITY_SYNONYMS[k] ?? [];
      if (syns.some((s) => q.includes(TextUtils.normalize(s)))) intent.amenityHints.push(k);
    }
    intent.amenityHints = Array.from(new Set(intent.amenityHints));

    return intent;
  },
};

// --- Indexer ---
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
    for (const v of arrays) {
      if (Array.isArray(v) && v.length) {
        // Handle array of objects with image_url property
        if (typeof v[0] === 'object' && v[0]?.image_url) {
          return v.map((img: any) => img.image_url);
        }
        // Handle array of strings
        return v;
      }
    }
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
  },
};

// ----------------------------------------------------------------------
// Availability helpers (MODERN + TRUSTWORTHY)
// ----------------------------------------------------------------------
type AvailabilityStatus = "unknown" | "full" | "low" | "medium" | "high";

function getAvailabilityNumber(hostel: any): number | null {
  // Accept common keys; DO NOT default to 0 (unknown must stay unknown)
  const raw =
    hostel?.beds_available ??
    hostel?.rooms_available ??
    hostel?.available_rooms ??
    hostel?.availability_count ??
    hostel?.roomsLeft ??
    hostel?.rooms_left;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const m = raw.replace(/,/g, "").match(/(\d+)/);
    if (m) {
      const n = Number(m[1]);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function getAvailabilityStatus(n: number | null): AvailabilityStatus {
  if (n == null) return "unknown";
  if (n <= 0) return "full";
  if (n <= 2) return "low";
  if (n <= 5) return "medium";
  return "high";
}

function getAvailabilityLabel(n: number | null): string {
  if (n == null) return "Check";
  if (n <= 0) return "Full";
  if (n <= 2) return "1–2";
  if (n <= 5) return "3–5";
  return "6+";
}

function getAvailabilitySubLabel(n: number | null): string {
  if (n == null) return "Availability";
  if (n <= 0) return "No rooms";
  return "Rooms Left";
}

function getAvailabilityUpdatedAt(hostel: any): Date | null {
  const raw =
    hostel?.availability_updated_at ??
    hostel?.availabilityUpdatedAt ??
    hostel?.updated_at ??
    hostel?.updatedAt;

  if (!raw) return null;

  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  return `${wk}w ago`;
}

function isAvailabilityVerified(hostel: any): boolean {
  // Flexible: supports different schemas
  const v = hostel?.availability_verified ?? hostel?.availabilityVerified ?? hostel?.verified;
  if (typeof v === "boolean") return v;

  const source = String(hostel?.availability_source ?? hostel?.availabilitySource ?? hostel?.source ?? "").toLowerCase();
  // Treat manager/admin sources as verified
  if (source.includes("manager") || source.includes("admin") || source.includes("owner")) return true;

  return false;
}

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

function SearchMosaicCard({
  item,
  onOpen,
  query,
}: {
  item: IndexedHostel;
  onOpen: () => void;
  query: string;
}) {
  const images = Indexer.getImageUrls(item.hostel);
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);
  const [a, b, c, d, e] = safeImages;

  // ✅ MODERN AVAILABILITY: range + unknown + verified + last-updated
  const availN = getAvailabilityNumber(item.hostel);
  const status = getAvailabilityStatus(availN);
  const label = getAvailabilityLabel(availN);
  const subLabel = getAvailabilitySubLabel(availN);
  const updatedAt = getAvailabilityUpdatedAt(item.hostel);
  const verified = isAvailabilityVerified(item.hostel);

  // Theme based on status
  const theme =
    status === "full"
      ? {
          nameHover: "group-hover/card:text-rose-700",
          icon: "text-rose-500",
          boxBg: "bg-rose-500",
          boxShadow: "shadow-rose-200",
          boxText: "text-white",
        }
      : status === "unknown"
        ? {
            nameHover: "group-hover/card:text-slate-900",
            icon: "text-slate-500",
            boxBg: "bg-slate-900",
            boxShadow: "shadow-slate-200",
            boxText: "text-white",
          }
        : status === "low"
          ? {
              nameHover: "group-hover/card:text-amber-700",
              icon: "text-amber-500",
              boxBg: "bg-amber-500",
              boxShadow: "shadow-amber-200",
              boxText: "text-white",
            }
          : {
              // medium/high → green
              nameHover: "group-hover/card:text-emerald-700",
              icon: "text-emerald-500",
              boxBg: "bg-emerald-500",
              boxShadow: "shadow-emerald-200",
              boxText: "text-white",
            };

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      {/* IMAGES */}
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform"
        type="button"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
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

        <div className="absolute bottom-4 right-4 z-10">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105">
            <ImageIcon className="h-4 w-4" />
            <span>See all photos</span>
          </div>
        </div>
      </button>

      {/* DETAILS LAYOUT */}
      <div className="px-2 pb-2">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT: Name and Location */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-xl font-extrabold text-slate-900 leading-tight ${theme.nameHover} transition-colors mb-1`}>
              {TextUtils.highlight(item.name, query)}
            </h3>

            {(item.location || item.address) && (
              <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium">
                <MapPin className={`h-4 w-4 ${theme.icon} shrink-0`} />
                <span className="truncate">{TextUtils.highlight(item.location || item.address, query)}</span>
              </div>
            )}
          </div>

          {/* RIGHT: Availability Bar */}
          <div className="shrink-0">
            {status === "full" ? (
              <div className={`inline-flex items-center gap-2 rounded-lg ${theme.boxBg} px-4 py-2 ${theme.boxText} shadow-md`}>
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-black uppercase tracking-wide">Full</span>
              </div>
            ) : (
              <div
                className={`group/box relative inline-flex items-center gap-2 rounded-lg ${theme.boxBg} px-4 py-2 ${theme.boxText} shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden`}
              >
                {status !== "unknown" && (
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}

                <div className="relative z-10 flex items-center gap-2">
                  {status === "unknown" ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : status === "low" ? (
                    <BedDouble className="h-5 w-5 animate-pulse" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}

                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black leading-none ${status === "low" ? "animate-pulse" : ""}`}>
                      {label}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide opacity-90">
                      {status === "unknown" ? "Available" : subLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// LAYER 3: VIEW CONTROLLER (React Component)
// ----------------------------------------------------------------------

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<"recommended" | "name_az" | "price_low">("recommended");
  const [roomTypeFilter, setRoomTypeFilter] = useState("Any");
  const [distanceFilter, setDistanceFilter] = useState("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
      setVisibleCount(12);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await getAllHostelsRepository();

        // Manual data injection (same as HomeFeatured)
        const manualHostels = [
          {
            id: "nana-agyoma-manual",
            name: "Nana Agyoma Hostel",
            address: "Amamoma, UCC",
            location: "Amamoma",
            description: "Modern student accommodation in Amamoma, close to UCC campus.",
            price_per_night: 800,
            room_type: "self-contained",
            beds_available: 12,
            verified: true,
            rating: 4.5,
            review_count: 23,
            main_image: "https://i.imgur.com/luYRCIq.jpeg",
            images: [
              { image_url: "https://i.imgur.com/luYRCIq.jpeg" },
              { image_url: "https://i.imgur.com/peh4mP5.jpeg" },
              { image_url: "https://i.imgur.com/CKdT7Di.jpeg" },
              { image_url: "https://i.imgur.com/Ci2Vn7D.jpeg" },
            ],
          },
          {
            id: "adoration-home-plus-manual",
            name: "Adoration Home Plus Hostel",
            address: "Ayensu, UCC",
            location: "Ayensu",
            description: "Quality student hostel in Ayensu area.",
            price_per_night: 750,
            room_type: "shared",
            beds_available: 8,
            verified: true,
            rating: 4.3,
            review_count: 18,
            main_image: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
            images: [
              { image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png" },
              { image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration1-300x300.jpg" },
              { image_url: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1-300x300.png" },
            ],
          },
        ];

        const existing = new Set(list.map((h: any) => h.name?.toLowerCase()));
        manualHostels.forEach((m) => {
          if (!existing.has(m.name.toLowerCase())) list.push(m);
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

  const indexed = useMemo(() => Indexer.build(hostels), [hostels]);

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

  const intent = useMemo(() => IntentParser.parse(debouncedSearch), [debouncedSearch]);

  const filteredItems = useMemo(() => {
    const locFilterNorm = TextUtils.normalize(locationFilter === "All" ? "" : locationFilter);
    const wantNear = distanceFilter === "Near campus";

    const pMinInput = (priceMinStr || "").replace(/,/g, "").trim();
    const pMaxInput = (priceMaxStr || "").replace(/,/g, "").trim();
    const priceMin = pMinInput ? Number(pMinInput) : intent.priceMin;
    const priceMax = pMaxInput ? Number(pMaxInput) : intent.priceMax;

    let roomTypeNeedles: string[] = [];
    if (roomTypeFilter !== "Any") {
      if (roomTypeFilter === "Self-contained") roomTypeNeedles = ["self-contained", "self con", "selfcontained"];
      else if (roomTypeFilter === "Single") roomTypeNeedles = ["single"];
      else if (roomTypeFilter === "Shared") roomTypeNeedles = ["shared", "2 in 1", "two in one"];
      else roomTypeNeedles = ["chamber", "hall", "chamber & hall"];
    }

    const amenityKeys = Array.from(new Set([...selectedAmenities, ...intent.amenityHints]));
    const qTokens = intent.queryTokens;

    const results = indexed
      .map((it) => {
        const matchesLocation =
          locationFilter === "All" ||
          (!!locFilterNorm && (it.locationN.includes(locFilterNorm) || it.addressN.includes(locFilterNorm)));
        const matchesDistance = wantNear ? it.nearCampus : true;
        const matchesRoom = roomTypeNeedles.length ? roomTypeNeedles.some((n) => it.roomTypeN.includes(TextUtils.normalize(n))) : true;

        const matchesAmenities =
          !amenityKeys.length ||
          amenityKeys.every((key) => {
            const syns = IntentParser.AMENITY_SYNONYMS[key] ?? [key];
            return syns.some((s) => it.amenityN.includes(TextUtils.normalize(s)));
          });

        const matchesPriceMin = priceMin == null || it.price == null ? true : it.price >= priceMin;
        const matchesPriceMax = priceMax == null || it.price == null ? true : it.price <= priceMax;

        const sName = SearchAlgo.score(it.nameN, qTokens);
        const sLoc = SearchAlgo.score(it.locationN, qTokens);
        const sAddr = SearchAlgo.score(it.addressN, qTokens);
        const sFeat = SearchAlgo.score(it.featuresN, qTokens);

        const hasQuery = qTokens.length > 0;
        const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;

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

        let score = sName * 3 + sLoc * 2 + sAddr * 1 + sFeat * 1 + it.hasImages * 60 + it.hasPrice * 40;
        if (!qTokens.length) score = it.hasImages * 60 + it.hasPrice * 40;
        if (intent.nearCampus && it.nearCampus) score += 80;
        if (intent.wantsCheap && it.price != null) score += Math.max(0, 8000 - it.price) / 50;

        if (wantNear && it.nearCampus) score += 60;
        if (roomTypeNeedles.length && matchesRoom) score += 40;
        if (amenityKeys.length && matchesAmenities) score += 30;

        return { it, score, passesAll };
      })
      .filter((x) => x.passesAll);

    results.sort((a, b) => {
      if (sortMode === "name_az") return a.it.nameN.localeCompare(b.it.nameN);
      if (sortMode === "price_low") {
        const ap = a.it.price ?? Infinity;
        const bp = b.it.price ?? Infinity;
        if (ap !== bp) return ap - bp;
      }
      return b.score - a.score;
    });

    return results.map((x) => x.it);
  }, [indexed, intent, locationFilter, roomTypeFilter, distanceFilter, selectedAmenities, priceMinStr, priceMaxStr, sortMode]);

  const suggestions = useMemo(() => {
    const q = TextUtils.normalize(searchTerm);
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

  const applySuggestion = (s: string) => {
    setSearchTerm(s);
    setShowSuggestions(false);
    setActiveSuggestion(0);
    inputRef.current?.focus();
  };

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    setVisibleCount(12);
  };

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

  const paged = filteredItems.slice(0, visibleCount);

  const activePills: Array<{ key: string; label: string; onClear: () => void }> = [];
  if (searchTerm.trim()) activePills.push({ key: "search", label: `Search: ${searchTerm}`, onClear: () => setSearchTerm("") });
  if (locationFilter !== "All") activePills.push({ key: "location", label: `Location: ${locationFilter}`, onClear: () => setLocationFilter("All") });
  if (sortMode !== "recommended") activePills.push({ key: "sort", label: sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z", onClear: () => setSortMode("recommended") });
  if (roomTypeFilter !== "Any") activePills.push({ key: "room", label: `Room: ${roomTypeFilter}`, onClear: () => setRoomTypeFilter("Any") });
  if (distanceFilter !== "Any") activePills.push({ key: "distance", label: `Distance: ${distanceFilter}`, onClear: () => setDistanceFilter("Any") });
  if (selectedAmenities.length) selectedAmenities.forEach((a) => activePills.push({ key: `amenity_${a}`, label: `Amenity: ${AMENITY_OPTIONS.find((o) => o.key === a)?.label || a}`, onClear: () => toggleAmenity(a) }));
  if (priceMinStr.trim()) activePills.push({ key: "pmin", label: `Min: ${priceMinStr}`, onClear: () => setPriceMinStr("") });
  if (priceMaxStr.trim()) activePills.push({ key: "pmax", label: `Max: ${priceMaxStr}`, onClear: () => setPriceMaxStr("") });
  if (intent.nearCampus && searchTerm.trim()) activePills.push({ key: "intent_near", label: "Intent: Near campus", onClear: () => setSearchTerm((prev) => prev.replace(/near campus|close to campus|ucc|campus/gi, "").trim()) });

  const filterProps = {
    uniqueLocations,
    locationFilter,
    setLocationFilter,
    sortMode,
    setSortMode,
    roomTypeFilter,
    setRoomTypeFilter,
    distanceFilter,
    setDistanceFilter,
    priceMinStr,
    setPriceMinStr,
    priceMaxStr,
    setPriceMaxStr,
    selectedAmenities,
    toggleAmenity,
    clearAll,
  };

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
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setActiveSuggestion(0);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (!showSuggestions || !suggestions.length) return;
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((p) => Math.min(p + 1, suggestions.length - 1)); }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((p) => Math.max(p - 1, 0)); }
                    if (e.key === "Enter") { e.preventDefault(); applySuggestion(suggestions[activeSuggestion]); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                />

                {searchTerm.trim() && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100" type="button">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}

                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl z-40">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => applySuggestion(s)}
                        className={`w-full text-left px-4 py-3 text-sm font-extrabold ${idx === activeSuggestion ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-800"}`}
                        type="button"
                        onMouseEnter={() => setActiveSuggestion(idx)}
                      >
                        {TextUtils.highlight(s, searchTerm)}
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

              <div className="hidden md:flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <div className="relative min-w-[200px]">
                  <MapPin className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
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

                <div className="relative min-w-[200px]">
                  <ArrowUpDown className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-slate-400" />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
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
              <div className="text-sm font-bold text-slate-700">{loading ? "Loading..." : `${filteredItems.length} hostels found`}</div>
              {activePills.length > 0 && (
                <button onClick={clearAll} className="text-sm font-extrabold text-slate-900 hover:text-emerald-700" type="button">
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

        <div className={`transition-opacity duration-300 ${loading || isTyping ? "opacity-60" : "opacity-100"}`}>
          {loading ? (
            <div className="grid grid-cols-1 gap-8 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-80 bg-slate-200 rounded-[2rem]" />
              ))}
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {paged.map((it) => (
                <SearchMosaicCard key={it.id} item={it} query={debouncedSearch} onOpen={() => onNavigate("detail", it.id)} />
              ))}

              {filteredItems.length > visibleCount && (
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
              <button onClick={clearAll} className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-white font-bold" type="button">
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
