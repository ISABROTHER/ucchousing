// ----------------------------------------------------------------------
// LAYER 1: ALGORITHMS & DOMAIN LOGIC
// ----------------------------------------------------------------------

import { supabase } from './supabase';

export type PriceUnit = "month" | "semester" | "year" | "day" | "unknown";

export type IndexedHostel = {
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

// --- Text Processing ---
export const TextUtils = {
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
};

// --- Fuzzy Search Algorithm ---
export const SearchAlgo = {
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

// --- Intent Parsing ---
export const IntentParser = {
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
export const Indexer = {
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
// LAYER 2: DATA ACCESS FUNCTIONS
// ----------------------------------------------------------------------

export async function getAllHostelsRepository() {
  const { data, error } = await supabase
    .from('hostels')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHostels() {
  return await getAllHostelsRepository();
}

export async function getFeaturedHostels(limit: number = 6) {
  const { data, error } = await supabase
    .from('hostels')
    .select('*')
    .eq('verified', true)
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getHostelById(id: string) {
  const { data, error } = await supabase
    .from('hostels')
    .select(`
      *,
      images:hostel_images(*),
      amenities:hostel_amenities(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getHostelsByOwner(ownerId: string) {
  const { data, error } = await supabase
    .from('hostels')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHostel(hostelData: any) {
  const { data, error } = await supabase
    .from('hostels')
    .insert(hostelData)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateHostel(id: string, hostelData: any) {
  const { data, error } = await supabase
    .from('hostels')
    .update(hostelData)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteHostel(id: string) {
  const { error } = await supabase
    .from('hostels')
    .delete()
    .eq('id', id);

  if (error) throw error;
}