import { useEffect, useState } from "react";
import { ArrowRight, AlertTriangle, Star, Building2, School, MapPin, Landmark } from "lucide-react";
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

  // New Housing Categories
  const housingCategories = [
    { 
      title: "New Site", 
      icon: Building2, 
      color: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100",
      borderColor: "group-hover:border-emerald-200"
    },
    { 
      title: "Old Site", 
      icon: School, 
      color: "bg-amber-50 text-amber-700 group-hover:bg-amber-100",
      borderColor: "group-hover:border-amber-200"
    },
    { 
      title: "Outside Campus", 
      icon: MapPin, 
      color: "bg-sky-50 text-sky-700 group-hover:bg-sky-100",
      borderColor: "group-hover:border-sky-200"
    },
    { 
      title: "Traditional Halls", 
      icon: Landmark, 
      color: "bg-rose-50 text-rose-700 group-hover:bg-rose-100",
      borderColor: "group-hover:border-rose-200"
    },
  ];

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

        {/* HOUSING CATEGORY BOXES */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {housingCategories.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => onNavigate("search")}
              className={`group relative flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/10 ${item.borderColor}`}
            >
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${item.color}`}>
                <item.icon className="h-8 w-8" />
              </div>
              <span className="text-sm font-extrabold text-slate-900">{item.title}</span>
            </button>
          ))}
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