import { useEffect, useMemo, useRef, useState } from "react";
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

// -------------------- Helpers --------------------
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

// Fuzzy token match: query tokens must be mostly present (substring match)
function fuzzyTokenMatch(text: string, queryTokens: string[]): number {
  const t = tokenize(text);
  if (!t.length || !queryTokens.length) return 0;

  let hits = 0;
  for (const q of queryTokens) {
    if (q.length <= 1) continue;
    const found = t.some((w) => w.includes(q) || q.includes(w));
    if (found) hits += 1;
  }
  return Math.round((hits / Math.max(1, queryTokens.length)) * 100); // 0..100
}

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find((x) => typeof x === "string" && x);
  return found ? [found] : [];
}

function extractPrice(hostel: any): number | null {
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

function hostelHaystack(hostel: any): { name: string; location: string; address: string; features: string } {
  const name = getStringField(hostel, "name") || "";
  const location = getStringField(hostel, "location") || "";
  const address = getStringField(hostel, "address") || "";

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
  return (
    t.includes("on campus") ||
    t.includes("near campus") ||
    t.includes("close to campus") ||
    t.includes("ucc") ||
    t.includes("campus")
  );
}

function textIncludesAny(hay: string, needles: string[]) {
  const h = normalize(hay);
  return needles.some((n) => h.includes(normalize(n)));
}

function safeNumberInput(v: string): number | null {
  const s = v.replace(/,/g, "").trim();
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function highlightMatch(text: string, query: string) {
  const q = normalize(query);
  const t = String(text || "");
  if (!q || !t) return t;

  // highlight only the first token for safety + simplicity
  const token = tokenize(q)[0];
  if (!token) return t;

  const idx = normalize(t).indexOf(token);
  if (idx < 0) return t;

  // This is a best-effort highlight (index on normalized may differ slightly).
  // We'll do a simple, safer approach: highlight by searching case-insensitively in original text.
  const re = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
  const parts = t.split(re);
  if (parts.length <= 1) return t;

  return (
    <span>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark
            key={i}
            className="rounded bg-emerald-100 px-1 py-0.5 font-extrabold text-emerald-900"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

// -------------------- Intent / NLP-ish parsing --------------------
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
  if (priceMaxMatch) {
    const n = Number(priceMaxMatch[2] ?? priceMaxMatch[1]);
    if (isFinite(n)) intent.priceMax = n;
  }

  const priceMinMatch = q.match(/(over|above|min|more than)\s+(\d{2,6})/) || q.match(/>\s*(\d{2,6})/);
  if (priceMinMatch) {
    const n = Number(priceMinMatch[2] ?? priceMinMatch[1]);
    if (isFinite(n)) intent.priceMin = n;
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

  // room type hints (Ghana terms)
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

  const amenityKeywords = ["wifi", "water", "security", "cctv", "generator", "backup", "kitchen", "bathroom", "toilet", "ac", "aircon", "laundry"];
  for (const k of amenityKeywords) {
    if (tokens.includes(k)) intent.amenityHints.push(k);
  }

  return intent;
}

// -------------------- UI components (same design language) --------------------
function Chip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
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

function Pill({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
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

// -------------------- Mosaic Card (same) with quick facts chips --------------------
function SearchMosaicCard({
  hostel,
  onOpen,
  query,
}: {
  hostel: any;
  onOpen: () => void;
  query: string;
}) {
  const name = getStringField(hostel, "name") || "Hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const images = getImageUrls(hostel);

  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);

  const [a, b, c, d, e] = safeImages;

  const price = extractPrice(hostel);

  // quick facts (best-effort; only show if present)
  const roomTypeText = normalize(toText(hostel.room_type ?? hostel.roomType ?? hostel.category ?? hostel.type ?? ""));
  const featuresText = normalize(toText(hostel.amenities ?? hostel.features ?? hostel.facilities ?? hostel.tags ?? ""));
  const near = isNearCampus(hostel);

  const quickChips: Array<{ label: string }> = [];
  if (price != null) quickChips.push({ label: `From ${price.toLocaleString()}` });
  if (textIncludesAny(roomTypeText, ["self-contained"])) quickChips.push({ label: "Self-contained" });
  else if (textIncludesAny(roomTypeText, ["shared", "2 in 1", "two in one"])) quickChips.push({ label: "Shared" });
  else if (textIncludesAny(roomTypeText, ["single"])) quickChips.push({ label: "Single room" });

  if (near) quickChips.push({ label: "Near campus" });
  if (textIncludesAny(featuresText, ["wifi"])) quickChips.push({ label: "Wi-Fi" });
  if (textIncludesAny(featuresText, ["security", "cctv"])) quickChips.push({ label: "Security" });

  // keep it clean: max 4 chips
  const displayChips = quickChips.slice(0, 4);

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
            {highlightMatch(name, query)}
          </h3>

          {price !== null && (
            <div className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI ranked</span>
            </div>
          )}
        </div>

        {location && (
          <div className="mt-1 flex items-center gap-1.5 text-slate-500 text-sm font-medium">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{highlightMatch(location, query)}</span>
          </div>
        )}

        {displayChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {displayChips.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-extrabold text-slate-700"
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SortMode = "recommended" | "name_az" | "price_low";
type RoomTypeFilter = "Any" | "Self-contained" | "Single" | "Shared" | "Chamber & Hall";
type DistanceFilter = "Any" | "Near campus";

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

// -------------------- Main Page --------------------
export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  // Search + debounce (predictive / instant)
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Filters
  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  // Extra modern filters (faceted)
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomTypeFilter>("Any");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");

  // Pagination (mobile performance)
  const [visibleCount, setVisibleCount] = useState(12);

  // Autocomplete / Suggestions (animated)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Debounce typing: smooth, app-like
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
      setVisibleCount(12); // reset pagination when searching
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // Load data once
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getHostels();
        const list = Array.isArray(data) ? [...data] : [];

        // Manual hostels (as you had)
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

  // Clean unique locations
  const uniqueLocations = useMemo(() => {
    const locs = new Set(
      hostels
        .map((h) => h.location || h.address || "")
        .filter(Boolean)
        .map((l) => String(l))
    );
    const clean = Array.from(locs)
      .map((l) => l.split(",")[0].trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
    return ["All", ...clean];
  }, [hostels]);

  // Build suggestions list (mobile-first + AI-era)
  const suggestions = useMemo(() => {
    const q = normalize(searchTerm);
    const base = [
      'under 800',
      'under 1000 near campus',
      'self con Ayensu',
      'Amamoma single room',
      'wifi + security',
      'near campus',
      'shared room',
      'self-contained',
      'budget',
    ];

    const locSuggestions = uniqueLocations
      .filter((l) => l !== "All")
      .slice(0, 10)
      .map((l) => `${l}`);

    const merged = Array.from(new Set([...base, ...locSuggestions]));

    if (!q) return merged.slice(0, 10);

    const scored = merged
      .map((s) => ({ s, score: fuzzyTokenMatch(s, tokenize(q)) }))
      .filter((x) => x.score > 0 || normalize(x.s).includes(q))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);

    return scored.slice(0, 10);
  }, [searchTerm, uniqueLocations]);

  // Close suggestions on outside click
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

  // Intent parse (AI-like)
  const intent = useMemo(() => parseIntent(debouncedSearch), [debouncedSearch]);

  // Price from UI numeric fields (these override intent if provided)
  const priceMinUI = useMemo(() => safeNumberInput(priceMinStr), [priceMinStr]);
  const priceMaxUI = useMemo(() => safeNumberInput(priceMaxStr), [priceMaxStr]);

  // Main scoring + filtering + faceted filters
  const scoredHostels = useMemo(() => {
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

    const amenityNeedles = selectedAmenities.map((k) => k);

    const wantNear = distanceFilter === "Near campus";

    const priceMin = priceMinUI ?? intent.priceMin;
    const priceMax = priceMaxUI ?? intent.priceMax;

    const qTokens = intent.queryTokens;

    const results = hostels
      .map((hostel) => {
        const { name, location, address, features } = hostelHaystack(hostel);

        const nameN = normalize(name);
        const locN = normalize(location);
        const addrN = normalize(address);
        const featN = normalize(features);

        // Location dropdown (case-insensitive)
        const matchesLocation =
          locationFilter === "All" ||
          (!!locFilterNorm && (locN.includes(locFilterNorm) || addrN.includes(locFilterNorm)));

        const p = extractPrice(hostel);
        const matchesPriceMin = priceMin == null || p == null ? true : p >= priceMin;
        const matchesPriceMax = priceMax == null || p == null ? true : p <= priceMax;

        const near = isNearCampus(hostel);
        const matchesDistance = wantNear ? near : true;

        // Room type filter (best-effort on text)
        const roomText = normalize(toText(hostel.room_type ?? hostel.roomType ?? hostel.category ?? hostel.type ?? hostel.features ?? ""));
        const matchesRoom = roomTypeNeedles.length ? textIncludesAny(roomText, roomTypeNeedles) : true;

        // Amenity filter (must include all selected)
        const amenityText = normalize(toText(hostel.amenities ?? hostel.features ?? hostel.facilities ?? hostel.tags ?? ""));
        const matchesAmenity =
          amenityNeedles.length === 0
            ? true
            : amenityNeedles.every((k) => amenityText.includes(normalize(k)));

        // Fuzzy relevance
        const sName = fuzzyTokenMatch(nameN, qTokens);
        const sLoc = fuzzyTokenMatch(locN, qTokens);
        const sAddr = fuzzyTokenMatch(addrN, qTokens);
        const sFeat = fuzzyTokenMatch(featN, qTokens);

        // Completeness signals
        const imgCount = getImageUrls(hostel).length;
        const hasImages = imgCount > 0 ? 1 : 0;
        const hasPrice = extractPrice(hostel) != null ? 1 : 0;

        // Base score (weighted)
        let score =
          sName * 3 +
          sLoc * 2 +
          sAddr * 1 +
          sFeat * 1 +
          hasImages * 60 +
          hasPrice * 40;

        if (!qTokens.length) score = hasImages * 60 + hasPrice * 40;

        // Intent boosts
        if (intent.wantsCheap && p != null) score += Math.max(0, 8000 - p) / 50;
        if (intent.nearCampus && near) score += 80;

        // Explicit filter boosts (so filtered results feel right)
        if (wantNear && near) score += 60;
        if (roomTypeNeedles.length && matchesRoom) score += 50;
        if (amenityNeedles.length && matchesAmenity) score += 30;

        // Query gate: if user typed something, require some signal OR strong filters
        const hasQuery = qTokens.length > 0;
        const anyFuzzyHit = sName > 0 || sLoc > 0 || sAddr > 0 || sFeat > 0;

        const passesQueryGate =
          !hasQuery ||
          anyFuzzyHit ||
          roomTypeNeedles.length > 0 ||
          amenityNeedles.length > 0 ||
          priceMin != null ||
          priceMax != null ||
          wantNear;

        const passesAll =
          matchesLocation &&
          matchesPriceMin &&
          matchesPriceMax &&
          matchesDistance &&
          matchesRoom &&
          matchesAmenity &&
          passesQueryGate;

        return { hostel, score, price: p, passesAll };
      })
      .filter((x) => x.passesAll);

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
      return b.score - a.score; // recommended
    });

    return sorted;
  }, [
    hostels,
    intent,
    locationFilter,
    sortMode,
    roomTypeFilter,
    distanceFilter,
    selectedAmenities,
    priceMinUI,
    priceMaxUI,
  ]);

  const filteredHostels = useMemo(() => scoredHostels.map((x) => x.hostel), [scoredHostels]);

  // Pagination slice (performance / mobile)
  const pagedHostels = useMemo(() => filteredHostels.slice(0, visibleCount), [filteredHostels, visibleCount]);

  // Active filter pills
  const activePills = useMemo(() => {
    const pills: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (searchTerm.trim()) {
      pills.push({ key: "search", label: `Search: ${searchTerm.trim()}`, onClear: () => setSearchTerm("") });
    }
    if (locationFilter !== "All") {
      pills.push({ key: "location", label: `Location: ${locationFilter}`, onClear: () => setLocationFilter("All") });
    }
    if (sortMode !== "recommended") {
      pills.push({
        key: "sort",
        label: sortMode === "price_low" ? "Sort: Lowest price" : "Sort: Name A–Z",
        onClear: () => setSortMode("recommended"),
      });
    }
    if (roomTypeFilter !== "Any") {
      pills.push({ key: "room", label: `Room: ${roomTypeFilter}`, onClear: () => setRoomTypeFilter("Any") });
    }
    if (distanceFilter !== "Any") {
      pills.push({ key: "distance", label: `Distance: ${distanceFilter}`, onClear: () => setDistanceFilter("Any") });
    }
    if (selectedAmenities.length) {
      selectedAmenities.forEach((a) => {
        const label = AMENITY_OPTIONS.find((x) => x.key === a)?.label ?? a;
        pills.push({
          key: `amenity_${a}`,
          label: `Amenity: ${label}`,
          onClear: () => setSelectedAmenities((prev) => prev.filter((x) => x !== a)),
        });
      });
    }
    if (priceMinStr.trim()) {
      pills.push({ key: "pmin", label: `Min: ${priceMinStr.trim()}`, onClear: () => setPriceMinStr("") });
    }
    if (priceMaxStr.trim()) {
      pills.push({ key: "pmax", label: `Max: ${priceMaxStr.trim()}`, onClear: () => setPriceMaxStr("") });
    }

    // Intent-based pills (only when user typed them)
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

  // Subtle transitions on results while typing/loading
  const showResultsFade = loading || isTyping;

  // Mobile filter drawer motion (slide + fade)
  const filtersOpen = showFilters;

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
    setVisibleCount(12);
  };

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 pt-24 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Mobile-first sticky search zone */}
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

                {/* clear X */}
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

                {/* typing indicator */}
                <div className={`mt-2 text-xs font-extrabold ${isTyping ? "text-emerald-600" : "text-slate-400"} transition-colors`}>
                  {isTyping ? "Searching…" : ""}
                </div>

                {/* suggestions dropdown */}
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
                          key={s}
                          type="button"
                          onClick={() => applySuggestion(s)}
                          className={[
                            "w-full text-left px-4 py-3 text-sm font-extrabold transition",
                            idx === activeSuggestion ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-50 text-slate-800",
                          ].join(" ")}
                          onMouseEnter={() => setActiveSuggestion(idx)}
                        >
                          {highlightMatch(s, searchTerm)}
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

                {/* Desktop filters container */}
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

            {/* Result count + Clear all */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-700">
                {loading ? "Loading hostels…" : `${filteredHostels.length.toLocaleString()} hostels found`}
              </div>

              {(activePills.length > 0) && (
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

            {/* Mobile filter drawer (slide + fade) */}
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
                  <div className="mt-2 text-xs font-bold text-slate-500">
                    Tip: You can also type “under 800” in search.
                  </div>
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

            {/* Desktop “quick filters” row (no drawer; stays clean) */}
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

                  <Chip
                    label="Wi-Fi"
                    active={selectedAmenities.includes("wifi")}
                    onClick={() => toggleAmenity("wifi")}
                  />

                  <Chip
                    label="Security"
                    active={selectedAmenities.includes("security")}
                    onClick={() => toggleAmenity("security")}
                  />

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

        {/* Results section with smooth transitions */}
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
          ) : filteredHostels.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-8">
                {pagedHostels.map((hostel) => (
                  <SearchMosaicCard
                    key={hostel.id}
                    hostel={hostel}
                    query={debouncedSearch}
                    onOpen={() => onNavigate("detail", hostel.id)}
                  />
                ))}
              </div>

              {/* Load more (mobile perf) */}
              {filteredHostels.length > visibleCount && (
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
 