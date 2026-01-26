import { useEffect, useState } from "react";
import { ArrowRight, AlertTriangle, Star, Image as ImageIcon } from "lucide-react";
import { PageType } from "../App";
import { getFeaturedHostels } from "../lib/hostels";
import HostelCard from "../components/HostelCard";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];

export default function HomePage({ onNavigate }: HomePageProps) {
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadFeatured();
  }, []);

  const loadFeatured = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFeaturedHostels(6);
      setFeatured(Array.isArray(data) ? data : []);
    } catch {
      setFeatured([]);
      setError("We could not load featured hostels right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const housingTypes = [
    { title: "New Site", icon: ImageIcon },
    { title: "Old Site", icon: ImageIcon },
    { title: "Outside Campus", icon: ImageIcon },
    { title: "Traditional Halls", icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      
      {/* HERO BANNER SECTION */}
      <div className="relative w-full h-96 sm:h-[32rem] lg:h-[40rem] bg-slate-100">
        <img 
          src="https://kuulchat.com/universities/slides/daa2e0179416fa0829b3586d2410fd94.png" 
          alt="UCC Housing Campus" 
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="mx-auto max-w-5xl px-4 -mt-16 relative z-10">
        
        {/* Headline */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-slate-100 sm:p-8">
            <h1 className="text-2xl font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              We have digitized student housing on campus. UCC, Find and apply without stress!
            </h1>
        </div>

        {/* HOUSING CATEGORIES SECTION */}
        <div className="mt-12">
          {/* Section Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Apply for housing</h2>
            <p className="text-lg font-medium text-slate-600 mt-1">Find your new home!</p>
          </div>

          {/* 4 Housing Boxes */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {housingTypes.map((type) => (
              <button
                key={type.title}
                onClick={() => onNavigate("search")}
                className="group flex flex-col text-left focus:outline-none"
              >
                {/* Photo Holder */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-200 transition-all duration-300 group-hover:shadow-md group-focus:ring-4 group-focus:ring-amber-200">
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <type.icon className="h-10 w-10 opacity-50" />
                  </div>
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                </div>
                
                {/* Title */}
                <span className="mt-3 text-base font-bold text-slate-900 group-hover:text-amber-700">
                  {type.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured hostels */}
        <div className="mt-16">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Featured hostels
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("search")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-rose-900">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadFeatured()}
                    className="mt-3 inline-flex items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-700/20"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-slate-100" />
                  <div className="mt-5 space-y-3">
                    <div className="h-5 w-2/3 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-4 w-full animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-11 w-full animate-pulse rounded-2xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((hostel) => (
                <div key={hostel.id} className="transition-transform duration-200 hover:-translate-y-0.5">
                  <HostelCard hostel={hostel} onClick={() => onNavigate("detail", hostel.id)} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-bold text-slate-900">No featured hostels yet</p>
              <p className="mt-2 text-sm font-medium text-slate-600">Please check back soon.</p>
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}