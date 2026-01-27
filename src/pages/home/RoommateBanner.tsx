// src/pages/components/RoommateBanner.tsx
import { useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { PageType } from "../../App";

interface RoommateBannerProps {
  onNavigate: (page: PageType) => void;
}

const SEARCH_HINTS = [
  'Try: "single room under 800"',
  'Try: "shared room near campus"',
  'Try: "Ayensu + self-contained"',
  'Try: "quiet roommate + budget 600"',
];

export default function RoommateBanner({ onNavigate }: RoommateBannerProps) {
  const [hintIndex, setHintIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const hint = useMemo(() => SEARCH_HINTS[hintIndex], [hintIndex]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // fade out briefly, then swap and fade in
      setFadeIn(false);

      window.setTimeout(() => {
        setHintIndex((prev) => (prev + 1) % SEARCH_HINTS.length);
        setFadeIn(true);
      }, 220);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 mt-10">
      <button
        type="button"
        onClick={() => onNavigate("search")}
        className="
          group relative w-full overflow-hidden rounded-2xl
          border border-slate-200/70 bg-white/80
          px-4 py-4 shadow-sm backdrop-blur
          transition-all duration-300
          hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300/80
          sm:px-6
        "
        aria-label="Find a roommate"
      >
        {/* Premium ambient glow (soft, not rough) */}
        <div className="pointer-events-none absolute -left-20 -top-16 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
        <div className="pointer-events-none absolute -right-24 -bottom-20 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />

        {/* Subtle sheen (very light) */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/70 to-transparent" />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          {/* Left: tight, clear hierarchy */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              {/* Line 1: title + trust badge (not scattered) */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm sm:text-base font-semibold text-slate-900">
                  Find a roommate that fits.
                </span>

                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Smart match
                </span>
              </div>

              {/* Line 2: single supportive line (clean) */}
              <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
                Match by budget, lifestyle & location — fast and stress-free.
              </p>

              {/* Line 3: “search hint” as one focused element */}
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex h-5 items-center rounded-md bg-slate-100 px-2 text-[10px] font-semibold text-slate-700">
                  Hint
                </span>
                <span
                  className={[
                    "truncate text-[11px] sm:text-xs font-medium text-slate-500 transition-all duration-200",
                    fadeIn ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-0.5",
                  ].join(" ")}
                >
                  {hint}
                </span>
              </div>
            </div>
          </div>

          {/* Right: CTA (simple + premium micro motion) */}
          <div className="shrink-0">
            <div
              className="
                inline-flex items-center gap-2 rounded-full
                bg-slate-900 px-4 py-2
                text-xs sm:text-sm font-semibold text-white
                shadow-sm transition-all duration-300
                group-hover:bg-slate-800
              "
            >
              <span>Get started</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>

        {/* Bottom hairline (premium finishing) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />
      </button>
    </div>
  );
}
