import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Star } from "lucide-react";
import { PageType } from "../App";
import { getFeaturedHostels } from "../lib/hostels";
import HostelCard from "../components/HostelCard";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];

type ActionCard = {
  title: string;
  description: string;
  onClick: () => void;
};

export default function HomePage({ onNavigate }: HomePageProps) {
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const actions: ActionCard[] = useMemo(
    () => [
      {
        title: "Apply for housing",
        description: "Find your new home!",
        onClick: () => onNavigate("search"),
      },
      {
        title: "Frequently Asked Questions",
        description:
          "The information you need about student housing — from applying to moving out.",
        onClick: () => onNavigate("faq" as PageType),
      },
      {
        title: "Calendar",
        description: "See what is taking place at your campus!",
        onClick: () => onNavigate("calendar" as PageType),
      },
    ],
    [onNavigate]
  );

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
      
      {/* HERO BANNER SECTION 
        - Full width (w-full)
        - Fixed height (h-64 mobile, h-80 desktop)
        - No side margins/padding so it touches edges
      */}
      <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-slate-100">
        <img 
          src="https://kuulchat.com/universities/slides/daa2e0179416fa0829b3586d2410fd94.png" 
          alt="UCC Housing Campus" 
          className="h-full w-full object-cover"
        />
        {/* Subtle gradient overlay for polish */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="mx-auto max-w-5xl px-4 -mt-8 relative z-10">
        
        {/* Headline */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-slate-100 sm:p-8">
            <h1 className="text-2xl font-extrabold leading-[1.2] tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              We have digitized student housing on campus. UCC, Find and apply without stress!
            </h1>
        </div>

        {/* Action cards */}
        <div className="mt-8 space-y-4">
          {actions.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="group w-full rounded-3xl bg-amber-100/55 px-5 py-5 text-left transition hover:bg-amber-100 focus:outline-none focus:ring-4 focus:ring-amber-200 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xl font-extrabold leading-[1.15] text-slate-900 sm:text-2xl">
                    {item.title}
                  </div>
                  <div className="mt-2 text-base font-medium leading-[1.5] text-slate-700">
                    {item.description}
                  </div>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-200/60 text-slate-900 transition group-hover:bg-amber-200">
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
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