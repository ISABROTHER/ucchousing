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
  desc: string;
  badge: string;
  meta: string;
  chips: [string, string];
};

const HOUSING_TYPES: HousingTypeCard[] = [
  {
    title: "New Site",
    image:
      "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    desc: "Modern campus residences",
    badge: "On campus",
    meta: "Popular for first-years",
    chips: ["Walk to lectures", "Reliable utilities"],
  },
  {
    title: "Old Site",
    image:
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
    desc: "Historic halls & housing",
    badge: "On campus",
    meta: "Strong community feel",
    chips: ["Near facilities", "Quiet zones"],
  },
  {
    title: "Outside Campus",
    image:
      "https://images.unsplash.com/photo-1600596542815-e32c8ec23fc2?q=80&w=800&auto=format&fit=crop",
    desc: "Private hostels nearby",
    badge: "More options",
    meta: "Best for privacy",
    chips: ["More space", "Flexible pricing"],
  },
  {
    title: "Traditional Halls",
    image:
      "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop",
    desc: "Community living",
    badge: "Classic",
    meta: "Student life experience",
    chips: ["Social setting", "Shared amenities"],
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
 * This is defensive so it won't break if your data shape differs.
 * If you have a known field (e.g., hostel.category), we can simplify this later.
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

function formatCount(count: number): string {
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`;
  return `${count}`;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [featured, setFeatured] = useState<FeaturedHostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [countsLoading, setCountsLoading] = useState<boolean>(true);
  const [countsError, setCountsError] = useState<string>("");
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
      setFeatured(Array.isArray(data) ? data : []);
    } catch {
      setFeatured([]);
      setError("We could not load featured hostels right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    setCountsLoading(true);
    setCountsError("");
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
      setCountsError("Counts unavailable");
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

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <Building2 className="h-4 w-4 text-emerald-700" />
              Verified categories
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <Star className="h-4 w-4 text-amber-600" />
              Featured picks
            </span>
          </div>
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

            {countsError ? (
              <p className="mt-3 text-sm font-bold text-rose-700">{countsError}</p>
            ) : null}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent opacity-85 transition-opacity duration-300 group-hover:opacity-95" />

                    {/* Badge (top-left) */}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold text-slate-900 shadow-sm backdrop-blur">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-800">
                        <Building2 className="h-3.5 w-3.5" />
                      </span>
                      {type.badge}
                    </div>

                    {/* Count Pill (top-right) — innovative “live inventory” feel */}
                    <div className="absolute right-3 top-3">
                      <div className="relative inline-flex items-center rounded-full bg-emerald-700 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                        {countsLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-white/90 animate-pulse" />
                            Loading
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-white/90" />
                            {formatCount(count)} listed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title + meta (bottom) */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-base font-extrabold leading-[1.2] text-white">
                        {type.title}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-[1.5] text-white/85">
                        {type.meta}
                      </p>
                    </div>

                    {/* Density bar (bottom edge) */}
                    <div className="absolute bottom-0 left-0 h-1 w-full bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-700 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((count / 60) * 100))}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-sm font-semibold leading-[1.5] text-slate-600">
                      {type.desc}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold leading-[1.2] text-slate-700">
                        {type.chips[0]}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-extrabold leading-[1.2] text-slate-700">
                        {type.chips[1]}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="text-xs font-bold leading-[1.5] text-slate-500">
                        {countsLoading ? "Checking availability…" : `${count} available`}
                      </span>
                      <span className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700 transition group-hover:text-emerald-800">
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