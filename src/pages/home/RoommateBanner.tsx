import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-red-600 px-4 py-4 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6"
        aria-label="Open roommate and smart search"
      >
        {/* Overlay: Gradient & Depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700" />
        
        {/* Shine Animation */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

        {/* Left Side: Text */}
        <div className="relative flex min-w-0 items-center gap-3 text-left">
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
              {/* Increased Font Size Here */}
              <span className="font-extrabold text-white text-xl sm:text-2xl">
                Need a roommate?
              </span>

              <span className="hidden text-xs font-semibold text-white/90 sm:inline-block">
                Match by budget, lifestyle & location.
              </span>
            </div>

            {/* Rotating Hint */}
            <div className="mt-1 flex items-center gap-2">
              <span className="truncate text-[11px] font-bold text-white/80 group-hover:text-white transition-colors">
                {SEARCH_HINTS[hintIndex]}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Button (White box, Red text, Search icon) */}
        <div className="relative flex shrink-0 items-center gap-2 pl-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-xs font-bold text-red-600 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
            Smart Search
            <Search className="h-3.5 w-3.5" />
          </span>
        </div>
      </button>
    </div>
  );
}