// src/pages/components/RoommateBanner.tsx
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { PageType } from "../../App";

interface RoommateBannerProps {
  onNavigate: (page: PageType) => void;
}

const SEARCH_HINTS = [
  'Try: "single room under 800"',
  'Try: "shared room near campus"',
  'Try: "Ayensu self-contained"',
  'Try: "quiet roommate budget 600"',
];

export default function RoommateBanner({ onNavigate }: RoommateBannerProps) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((prev) => (prev + 1) % SEARCH_HINTS.length);
    }, 2800);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 mt-10">
      <button
        type="button"
        onClick={() => onNavigate("search")}
        className="
          group relative flex w-full items-center justify-between
          rounded-xl border border-slate-200 bg-white/80
          px-4 py-3 shadow-sm backdrop-blur
          transition-all hover:border-slate-300 hover:shadow-md
          sm:px-6
        "
        aria-label="Find a roommate"
      >
        {/* Soft highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-slate-50/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Left */}
        <div className="relative flex min-w-0 items-center gap-3 text-left">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-semibold text-slate-900 text-sm sm:text-base">
                Need a roommate?
              </span>

              <span className="hidden text-xs font-medium text-slate-500 sm:inline-block">
                Find compatible students easily.
              </span>
            </div>

            {/* Smart hint (calm) */}
            <div className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
              {SEARCH_HINTS[hintIndex]}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="relative flex shrink-0 items-center gap-2 pl-4 text-xs font-semibold text-slate-700 transition-colors group-hover:text-slate-900 sm:text-sm">
          <span>Explore</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </div>
  );
}
