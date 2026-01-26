import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Star, Building2 } from "lucide-react";
import { PageType } from "../App";
import { getFeaturedHostels, getHostels } from "../lib/hostels";
import HostelCard from "../components/HostelCard";

interface HomePageProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

type FeaturedHostel = Awaited<ReturnType<typeof getFeaturedHostels>>[number];
type AllHostel = Awaited<ReturnType<typeof getHostels>>[number];

type HousingKey = "New Site" | "Old Site" | "Outside Campus" | "Traditional Halls";

type HousingTypeCard = {
  title: HousingKey;
  image: string;
  badge: string;
};

const HOUSING_TYPES: HousingTypeCard[] = [
  {
    title: "New Site",
    image:
      "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
  {
    title: "Old Site",
    image:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
  {
    title: "Outside Campus",
    image:
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop",
    badge: "Off campus",
  },
  {
    title: "Traditional Halls",
    image:
      "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
];

function getStringField(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Attempts to infer which of the 4 housing categories a hostel belongs to.
 */
function inferHousingKey(hostel: AllHostel): HousingKey | undefined {
  const candidates = [
    getStringField(hostel, "housingType"),
    getStringField(hostel, "housing_type"),
    getStringField(hostel, "category"),
    getStringField(hostel, "type"),
    getStringField(hostel, "site"),
    getStringField(hostel, "campusSite"),
    getStringField(hostel, "campus_site"),
    getStringField(hostel, "locationCategory"),
    getStringField(hostel, "location_category"),
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  const joined = normalizeText(candidates.join(" "));

  if (joined.includes("new site")) return "New Site";
  if (joined.includes("old site")) return "Old Site";
  if (joined.includes("traditional")) return "Traditional Halls";
  if (
    joined.includes("outside") ||
    joined.includes("off campus") ||
    joined.includes("off-campus") ||
    joined.includes("private")
  )
    return "Outside Campus";

  return undefined;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [countsLoading, setCountsLoading] = useState<boolean>(true);
  const [countsByType, setCountsByType] = useState<Record<HousingKey, number>>({
    "New Site": 0,
    "Old Site": 0,
    "Outside Campus": 0,
    "Traditional Halls": 0,
  });

  useEffect(() => {
    void loadFeatured();
    void loadCounts();
  }, []);

  const loadFeatured = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFeaturedHostels(6);
      const list = Array.isArray(data) ? [...data] : [];
      
      // Manually add "Nana Agyoma Hostel" to the featured list
      // Using 'as any' to ensure it fits the type structure for display purposes
      const manualHostel: any = {
        id: "nana-agyoma-manual",
        name: "Nana Agyoma Hostel",
        description: "Premium accommodation located at Amamoma, close to the Diaspora halls.",
        price: 3200,
        address: "Amamoma, UCC",
        location: "Amamoma, UCC", // Fallback if component uses location
        rating: 4.8,
        reviews_count: 42,
        images: ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600&auto=format&fit=crop"],
        main_image: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=600&auto=format&fit=crop",
        amenities: ["Wifi", "Water", "Security"]
      };

      // Check if it's already in the list to avoid duplicates if DB has it
      if (!list.find(h => h.name === manualHostel.name)) {
        list.push(manualHostel);
      }

      setFeatured(list);
    } catch {
      setFeatured([]);
      setError("We could not load featured hostels right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    setCountsLoading(true);
    try {
      const all = await getHostels();
      const next: Record<HousingKey, number> = {
        "New Site": 0,
        "Old Site": 0,
        "Outside Campus": 0,
        "Traditional Halls": 0,
      };

      if (Array.isArray(all)) {
        for (const hostel of all) {
          const key = inferHousingKey(hostel);
          if (key) next[key] += 1;
        }
      }

      setCountsByType(next);
    } catch {
      setCountsByType({
        "New Site": 0,
        "Old Site": 0,
        "Outside Campus": 0,
        "Traditional Halls": 0,
      });
    } finally {
      setCountsLoading(false);
    }
  };

  const housingTypes = useMemo(() => HOUSING_TYPES, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* HERO BANNER SECTION */}
      <div className="relative w-full h-96 sm:h-[32rem] lg:h-[40rem] bg-slate-100">
        <img
          src="https://kuulchat.com/universities/slides/daa2e0179416fa0829b3586d2410fd94.png"
          alt="UCC Housing Campus"
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
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
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold leading-[1.2] text-slate-900">
                  Apply for housing
                </h2>
                <p className="text-lg font-medium leading-[1.5] text-slate-600 mt-1">
                  Find your new home!
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadCounts()}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                >
                  Refresh counts
                </button>
              </div>
            </div>
          </div>

          {/* 4 Premium Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {housingTypes.map((type) => {
              const count = countsByType[type.title] ?? 0;

              return (
                <button
                  key={type.title}
                  onClick={() => onNavigate("search")}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
                  aria-label={`Explore ${type.title} housing`}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                    <img
                      src={type.image}
                      alt={type.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />

                    {/* Badge (Top Left) */}
                    <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm">
                      {type.badge}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    {/* Title in Body */}
                    <p className="text-base font-extrabold leading-[1.2] text-slate-900 group-hover:text-amber-600 transition-colors">
                      {type.title}
                    </p>

                    {/* View Link & Count */}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold text-slate-400">
                        {countsLoading ? "..." : `${count} listed`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-700 transition group-hover:text-emerald-800">
                        View
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Featured hostels */}
        <div className="mt-16">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-600" />
              <h2 className="text-xl font-extrabold tracking-tight leading-[1.2] text-slate-900 sm:text-2xl">
                Featured hostels
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("search")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
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
                  <p className="text-sm font-extrabold leading-[1.5] text-rose-900">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadFeatured()}
                    className="mt-3 inline-flex items-center justify-center rounded-2xl bg-rose-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-700/20"
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
              <p className="text-base font-extrabold leading-[1.2] text-slate-900">No featured hostels yet</p>
              <p className="mt-2 text-sm font-semibold leading-[1.5] text-slate-600">Please check back soon.</p>
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
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