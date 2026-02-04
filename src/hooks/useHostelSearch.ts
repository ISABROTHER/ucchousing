import { useState, useEffect, useMemo } from "react";
import { getAllHostelsRepository } from "../lib/hostels";
import { TextUtils, SearchAlgo, IntentParser, Indexer, type IndexedHostel } from "../lib/search";

export function useHostelSearch() {
  // --- Data State ---
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Search State ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // --- Filter State ---
  const [locationFilter, setLocationFilter] = useState("All");
  const [sortMode, setSortMode] = useState<"recommended" | "name_az" | "price_low">("recommended");
  const [roomTypeFilter, setRoomTypeFilter] = useState("Any");
  const [distanceFilter, setDistanceFilter] = useState("Any");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [priceMinStr, setPriceMinStr] = useState("");
  const [priceMaxStr, setPriceMaxStr] = useState("");

  // 1. Debounce Input
  useEffect(() => {
    setIsTyping(true);
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setIsTyping(false);
    }, 180);
    return () => window.clearTimeout(t);
  }, [searchTerm]);

  // 2. Fetch Data
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

  // 3. Indexing
  const indexed = useMemo(() => Indexer.build(hostels), [hostels]);

  // 4. Locations
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

  // 5. Intent
  const intent = useMemo(() => IntentParser.parse(debouncedSearch), [debouncedSearch]);

  // 6. Filtering & Scoring
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

  // 7. Suggestions
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

  const clearAll = () => {
    setSearchTerm("");
    setLocationFilter("All");
    setSortMode("recommended");
    setRoomTypeFilter("Any");
    setDistanceFilter("Any");
    setSelectedAmenities([]);
    setPriceMinStr("");
    setPriceMaxStr("");
  };

  const toggleAmenity = (key: string) => {
    setSelectedAmenities((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  return {
    state: {
      searchTerm,
      debouncedSearch,
      isTyping,
      locationFilter,
      sortMode,
      roomTypeFilter,
      distanceFilter,
      selectedAmenities,
      priceMinStr,
      priceMaxStr,
      hostels,
      loading,
    },
    actions: {
      setSearchTerm,
      setLocationFilter,
      setSortMode,
      setRoomTypeFilter,
      setDistanceFilter,
      setSelectedAmenities,
      setPriceMinStr,
      setPriceMaxStr,
      clearAll,
      toggleAmenity,
    },
    computed: {
      filteredItems,
      suggestions,
      uniqueLocations,
      intent,
    },
  };
} 