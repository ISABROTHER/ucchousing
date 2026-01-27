import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { PageType } from "../../App";

interface RoommateBannerProps {
  onNavigate: (page: PageType) => void;
}

// "Data of people looking for roommates"
const ROOMMATE_REQUESTS = [
  "Sarah (Lvl 200) • Looking in Ayensu • Budget 800",
  "Kwame • Needs roommate near Science • Shared",
  "Jessica (Lvl 300) • Old Site • Quiet study env",
  "Daniel • Casford Hall • Looking for non-smoker",
  "Ama • Valco Hall • Budget 600 • Urgent",
];

export default function RoommateBanner({ onNavigate }: RoommateBannerProps) {
  const [requestIndex, setRequestIndex] = useState(0);

  useEffect(() => {
    // Rotate every 3 seconds
    const id = window.setInterval(() => {
      setRequestIndex((prev) => (prev + 1) % ROOMMATE_REQUESTS.length);
    }, 3000);

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
              <span className="font-extrabold text-white text-xl sm:text-2xl">
                Need a roommate?
              </span>

              <span className="hidden text-xs font-semibold text-white/90 sm:inline-block">
                Match by budget, lifestyle & location.
              </span>
            </div>

            {/* Rotating Roommate Request Data */}
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="truncate text-[11px] font-bold text-white/90 group-hover:text-white transition-colors">
                {ROOMMATE_REQUESTS[requestIndex]}
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