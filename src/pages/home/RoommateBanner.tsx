import { Sparkles, ArrowRight } from "lucide-react";
import { PageType } from "../../App";

interface RoommateBannerProps {
  onNavigate: (page: PageType) => void;
}

export default function RoommateBanner({ onNavigate }: RoommateBannerProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 mt-10">
      <button
        onClick={() => onNavigate("search")}
        className="group relative flex w-full items-center justify-between overflow-hidden rounded-xl bg-slate-900 px-4 py-3 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg sm:px-6"
      >
        {/* Subtle Background Gradients */}
        <div className="absolute -left-4 -top-12 h-24 w-24 rounded-full bg-indigo-500/20 blur-xl" />
        <div className="absolute -right-4 -bottom-12 h-24 w-24 rounded-full bg-emerald-500/20 blur-xl" />
        
        {/* Shine Animation */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

        {/* Left Side: Icon & Text */}
        <div className="relative flex items-center gap-3 text-left">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-bold text-white text-sm sm:text-base">
              Need a roommate?
            </span>
            <span className="hidden text-xs font-medium text-slate-400 sm:inline-block">
              Connect with students & find your match.
            </span>
          </div>
        </div>

        {/* Right Side: Action */}
        <div className="relative flex items-center gap-2 pl-4 text-xs font-bold text-white transition-colors group-hover:text-indigo-200 sm:text-sm">
          <span>Get Started</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </button>
    </div>
  );
}