import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setHintIndex((prev) => (prev + 1) % SEARCH_HINTS.length);
    }, 2600);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 mt-10">
      <button
        type="button"
        onClick={() => onNavigate("search")}
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-6"
        aria-label="Open roommate and smart search"
      >
        {/* Subtle Hover Background */}
        <div className="absolute inset-0 bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Left Side: Text Only (Logo removed) */}
        <div className="relative flex min-w-0 items-center gap-3 text-left">
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                Need a roommate?
              </span>

              <span className="hidden text-xs font-medium text-slate-500 sm:inline-block">
                Match by budget, lifestyle & location.
              </span>
            </div>

            {/* Rotating Hint - Styled for light mode */}
            <div className="mt-0.5 flex items-center gap-2">
              <span className="truncate text-[11px] font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">
                {SEARCH_HINTS[hintIndex]}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Button (Renamed to Smart Search) */}
        <div className="relative flex shrink-0 items-center gap-2 pl-4 text-xs font-bold text-slate-900 transition-colors group-hover:text-indigo-600 sm:text-sm">
          <span>Smart Search</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </div>
  );
}