// src/components/SmartThinSearchBar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, MapPin, SlidersHorizontal, X } from "lucide-react";

type Intent = {
  label: string;
  key: "priceMax" | "type" | "location" | "roommate";
  value: string;
};

type ParsedQuery = {
  raw: string;
  priceMax?: number;
  type?: "single" | "shared" | "self-contained";
  location?: string;
  roommate?: boolean;
};

interface SmartThinSearchBarProps {
  onSearch: (parsed: ParsedQuery) => void;
  className?: string;
  locations?: string[]; // optional known locations for smarter detection
}

const DEFAULT_HINTS = [
  'Try: "single under 800 ayensu"',
  'Try: "shared near campus"',
  'Try: "self-contained cape coast"',
  'Try: "roommate budget 600"',
];

const RECENTS_KEY = "smart_search_recents_v1";

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function parseQuery(raw: string, locations: string[] = []): ParsedQuery {
  const text = normalize(raw);
  const tokens = text.split(/\s+/).filter(Boolean);

  const parsed: ParsedQuery = { raw };

  // price: detect "under 800", "below 700", or standalone number like 800
  const underIdx = tokens.findIndex((t) => t === "under" || t === "below" || t === "<");
  if (underIdx >= 0 && tokens[underIdx + 1]) {
    const n = Number(tokens[underIdx + 1].replace(/[^\d]/g, ""));
    if (!Number.isNaN(n) && n > 0) parsed.priceMax = n;
  } else {
    // fallback: any 3+ digit number could be budget
    const numTok = tokens.find((t) => /^\d{3,5}$/.test(t));
    if (numTok) {
      const n = Number(numTok);
      if (!Number.isNaN(n) && n > 0) parsed.priceMax = n;
    }
  }

  // type
  if (tokens.includes("single")) parsed.type = "single";
  if (tokens.includes("shared")) parsed.type = "shared";
  if (tokens.includes("self-contained") || (tokens.includes("self") && tokens.includes("contained")))
    parsed.type = "self-contained";

  // roommate intent
  if (tokens.includes("roommate") || tokens.includes("room-mate")) parsed.roommate = true;

  // location: match against known locations (best), else pick last word if it looks like a place
  const locMatch = locations.find((loc) => text.includes(normalize(loc)));
  if (locMatch) parsed.location = locMatch;

  return parsed;
}

function buildIntents(parsed: ParsedQuery): Intent[] {
  const intents: Intent[] = [];
  if (typeof parsed.priceMax === "number") {
    intents.push({ label: `Under ${parsed.priceMax}`, key: "priceMax", value: String(parsed.priceMax) });
  }
  if (parsed.type) {
    const label = parsed.type === "self-contained" ? "Self-contained" : parsed.type === "single" ? "Single" : "Shared";
    intents.push({ label, key: "type", value: parsed.type });
  }
  if (parsed.location) intents.push({ label: parsed.location, key: "location", value: parsed.location });
  if (parsed.roommate) intents.push({ label: "Roommate", key: "roommate", value: "true" });
  return intents.slice(0, 3); // keep thin and clean
}

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string").slice(0, 6);
    return [];
  } catch {
    return [];
  }
}

function writeRecent(query: string) {
  const q = query.trim();
  if (!q) return;
  const prev = readRecents();
  const next = [q, ...prev.filter((x) => x !== q)].slice(0, 6);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function SmartThinSearchBar({
  onSearch,
  className = "",
  locations = [],
}: SmartThinSearchBarProps) {
  const [value, setValue] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const parsed = useMemo(() => parseQuery(value, locations), [value, locations]);
  const intents = useMemo(() => buildIntents(parsed), [parsed]);

  const recents = useMemo(() => (open ? readRecents() : []), [open]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((p) => (p + 1) % DEFAULT_HINTS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  function submit(raw?: string) {
    const q = typeof raw === "string" ? raw : value;
    const p = parseQuery(q, locations);
    writeRecent(q);
    setOpen(false);
    onSearch(p);
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        className="
          relative flex items-center gap-2
          rounded-full border border-slate-200 bg-white/80
          px-3 py-2 shadow-sm backdrop-blur
          transition-all duration-300
          hover:border-slate-300 hover:shadow-md
          focus-within:border-slate-400
        "
      >
        <MapPin className="h-4 w-4 text-slate-400" />

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // small delay so click on recents works
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={DEFAULT_HINTS[hintIndex]}
          className="
            w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400
            outline-none
          "
        />

        {/* Inline “intent chips” (thin + smart) */}
        <div className="hidden sm:flex items-center gap-1">
          {intents.map((it) => (
            <span
              key={`${it.key}:${it.value}`}
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
              title="Detected from your search"
            >
              {it.label}
            </span>
          ))}
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100"
            aria-label="Open search options"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          </button>
        )}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()} // keep focus
          onClick={() => submit()}
          className="
            inline-flex items-center gap-2 rounded-full
            bg-slate-900 px-3 py-2
            text-xs font-semibold text-white
            shadow-sm transition-all duration-300
            hover:bg-slate-800
          "
          aria-label="Search"
        >
          <span className="hidden sm:inline">Search</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* tiny “thinking” pulse */}
        <span className="pointer-events-none absolute -bottom-2 left-8 h-1 w-1 rounded-full bg-emerald-500/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Floating panel (below bar, bar remains thin) */}
      {open && (recents.length > 0 || value.trim().length === 0) && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-slate-600">
            {value.trim() ? "Suggestions" : "Recent searches"}
          </div>

          <div className="divide-y divide-slate-100">
            {(value.trim() ? intents.map((i) => i.label) : recents).slice(0, 5).map((item) => (
              <button
                key={item}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(item);
                  submit(item);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
