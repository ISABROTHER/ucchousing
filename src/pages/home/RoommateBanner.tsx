import { Sparkles, ArrowRight } from "lucide-react";
import { PageType } from "../../App";

interface RoommateBannerProps {
  onNavigate: (page: PageType) => void;
}

export default function RoommateBanner({ onNavigate }: RoommateBannerProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 mt-12">
      <div className="group relative overflow-hidden rounded-3xl bg-slate-900 shadow-xl ring-1 ring-slate-900/5 transition-transform hover:-translate-y-1 duration-500">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-3xl" />
        
        {/* Animated shine effect */}
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />

        <div className="relative flex flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row sm:px-10">
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">New Feature</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              I need a roommate
            </h2>
            <p className="max-w-md text-slate-400 font-medium">
              Connect with other students, match preferences, and find your ideal roommate today.
            </p>
          </div>

          <button
            onClick={() => onNavigate("search")}
            className="group/btn inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-indigo-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}