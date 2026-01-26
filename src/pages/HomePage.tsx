// src/pages/HomePage.tsx
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, AlertTriangle, Star, Image as ImageIcon } from "lucide-react";
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

function getNumberField(obj: unknown, key: string): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getStringArrayField(obj: unknown, key: string): string[] | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  return out.length > 0 ? out : undefined;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

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

function getImageUrls(hostel: FeaturedHostel): string[] {
  const record = hostel as unknown as Record<string, unknown>;
  const arrays: Array<unknown> = [
    record.images,
    record.image_urls,
    record.imageUrls,
    record.photos,
    record.photo_urls,
    record.gallery,
    record.media,
    record.pictures,
    record.picture_urls,
  ];

  for (const v of arrays) {
    if (Array.isArray(v)) {
      const urls = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (urls.length > 0) return urls;
    }
  }

  const singles: Array<unknown> = [
    record.main_image,
    record.mainImage,
    record.cover_image,
    record.coverImage,
    record.image,
    record.thumbnail,
    record.thumbnail_url,
  ];

  const found = singles.find((x) => typeof x === "string" && x.trim().length > 0) as
    | string
    | undefined;

  return found ? [found] : [];
}

function getNearbyChips(hostel: FeaturedHostel): string[] {
  const arr =
    getStringArrayField(hostel, "nearby") ??
    getStringArrayField(hostel, "nearby_places") ??
    getStringArrayField(hostel, "nearbyPlaces") ??
    getStringArrayField(hostel, "highlights") ??
    getStringArrayField(hostel, "tags");

  if (arr && arr.length > 0) return arr.slice(0, 4);

  const str =
    getStringField(hostel, "nearby_text") ??
    getStringField(hostel, "nearbyText") ??
    getStringField(hostel, "highlights_text") ??
    getStringField(hostel, "highlightsText");

  if (str && str.trim().length > 0) {
    const parts = str
      .split(/[•|,]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.slice(0, 4);
  }

  return ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"];
}

function FeaturedPhotoMosaicCard({
  hostel,
  onOpen,
}: {
  hostel: FeaturedHostel;
  onOpen: () => void;
}) {
  const record = hostel as unknown as Record<string, unknown>;
  const name = (typeof record.name === "string" && record.name.trim().length > 0
    ? record.name
    : typeof record.title === "string" && record.title.trim().length > 0
    ? record.title
    : "Featured hostel") as string;

  const location = (typeof record.location === "string" && record.location.trim().length > 0
    ? record.location
    : typeof record.address === "string" && record.address.trim().length > 0
    ? record.address
    : undefined) as string | undefined;

  const rating =
    getNumberField(hostel, "rating") ??
    getNumberField(hostel, "avg_rating") ??
    getNumberField(hostel, "avgRating");

  const reviewCount =
    getNumberField(hostel, "reviews_count") ??
    getNumberField(hostel, "review_count") ??
    getNumberField(hostel, "reviewsCount");

  const images = getImageUrls(hostel);
  const pics = images.length >= 5 ? images.slice(0, 5) : images;
  const [a, b, c, d, e] = pics;
  const nearby = getNearbyChips(hostel);

  const hasGallery = Boolean(a && b);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onOpen}
              className="w-full text-left focus:outline-none"
              aria-label={`Open ${name}`}
            >
              <h3 className="truncate text-lg font-extrabold leading-[1.2] text-slate-900 sm:text-xl">
                {name}
              </h3>
            </button>
            {location ? (
              <p className="mt-1 truncate text-sm font-semibold leading-[1.5] text-slate-600">
                {location}
              </p>
            ) : null}

            <p className="mt-3 text-sm font-semibold leading-[1.5] text-slate-600">
              {nearby.join(" • ")}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            {typeof rating === "number" ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-900">
                <Star className="h-4 w-4 text-amber-600" />
                <span>{rating.toFixed(1)}</span>
                {typeof reviewCount === "number" ? (
                  <span className="font-semibold text-slate-500">({Math.max(0, Math.floor(reviewCount))})</span>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
            >
              Open
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="group relative mt-4 block w-full overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
          aria-label={`View photos for ${name}`}
        >
          {/* Desktop/tablet mosaic (like your screenshot) */}
          <div className="hidden sm:grid grid-cols-4 grid-rows-2 gap-2 p-2">
            <div className="col-span-2 row-span-2 overflow-hidden rounded-xl bg-slate-200">
              {a ? (
                <img
                  src={a}
                  alt={`${name} photo 1`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="col-span-1 row-span-1 overflow-hidden rounded-xl bg-slate-200">
              {b ? (
                <img
                  src={b}
                  alt={`${name} photo 2`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="col-span-1 row-span-1 overflow-hidden rounded-xl bg-slate-200">
              {c ? (
                <img
                  src={c}
                  alt={`${name} photo 3`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="col-span-1 row-span-1 overflow-hidden rounded-xl bg-slate-200">
              {d ? (
                <img
                  src={d}
                  alt={`${name} photo 4`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>

            <div className="col-span-1 row-span-1 overflow-hidden rounded-xl bg-slate-200">
              {e ? (
                <img
                  src={e}
                  alt={`${name} photo 5`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </div>

          {/* Mobile: clean grid (no horizontal scroll), includes "See all" pill */}
          <div className="grid sm:hidden grid-cols-2 gap-2 p-2">
            <div className="col-span-2 overflow-hidden rounded-xl bg-slate-200">
              <div className="aspect-[16/9] w-full">
                {a ? (
                  <img
                    src={a}
                    alt={`${name} photo 1`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-slate-200">
              <div className="aspect-[4/3] w-full">
                {b ? (
                  <img
                    src={b}
                    alt={`${name} photo 2`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-slate-200">
              <div className="aspect-[4/3] w-full">
                {(c ?? a) ? (
                  <img
                    src={(c ?? a) as string}
                    alt={`${name} photo 3`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
              <div className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-extrabold text-slate-900 shadow-sm backdrop-blur">
                <ImageIcon className="h-4 w-4" />
                See all photos
              </div>
            </div>
          </div>

          {!hasGallery ? (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-extrabold text-slate-900 shadow-sm backdrop-blur">
                Add at least 2 photos for the featured gallery preview
              </div>
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
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

      const manualHostels = [
        {
          id: "nana-agyoma-manual",
          name: "Nana Agyoma Hostel",
          description:
            "Premium accommodation located at Amamoma, close to the Diaspora halls. Spacious rooms.",
          price: 3200,
          address: "Amamoma, UCC",
          location: "Amamoma",
          rating: 4.8,
          reviews_count: 42,
          main_image:
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop",
          ],
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"],
        },
        {
          id: "success-city-manual",
          name: "Success City Hostel",
          description:
            "Modern student living with backup generator and study rooms. 5min walk to campus.",
          price: 4500,
          address: "Kwakyerkrom, UCC",
          location: "Kwakyerkrom",
          rating: 4.6,
          reviews_count: 28,
          main_image:
            "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
          images: [
            "https://images.unsplash.com/photo-1596276020587-8044fe049813?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1560067174-8943bd8f2662?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=1200&auto=format&fit=crop",
          ],
          nearby: ["Bus stop", "Grocery store", "Student gym", "Nature & leisure"],
        },
      ] as unknown as FeaturedHostel[];

      const existingNames = new Set(
        list
          .map((h) => (h as unknown as Record<string, unknown>).name)
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
          .map((x) => x.trim().toLowerCase())
      );

      for (const m of manualHostels) {
        const mName = getStringField(m, "name");
        if (!mName) continue;
        if (!existingNames.has(mName.trim().toLowerCase())) list.push(m);
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

                    <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm">
                      {type.badge}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-base font-extrabold leading-[1.2] text-slate-900 group-hover:text-amber-600 transition-colors">
                      {type.title}
                    </p>

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
            <div className="grid grid-cols-1 gap-5">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="h-5 w-2/3 animate-pulse rounded-lg bg-slate-100" />
                  <div className="mt-3 h-4 w-full animate-pulse rounded-lg bg-slate-100" />
                  <div className="mt-4 aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-100" />
                </div>
              ))}
            </div>
          ) : featured.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {featured.map((hostel) => (
                <FeaturedPhotoMosaicCard
                  key={hostel.id}
                  hostel={hostel}
                  onOpen={() => onNavigate("detail", hostel.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-base font-extrabold leading-[1.2] text-slate-900">
                No featured hostels yet
              </p>
              <p className="mt-2 text-sm font-semibold leading-[1.5] text-slate-600">
                Please check back soon.
              </p>
              <button
                type="button"
                onClick={() => void loadFeatured()}
                className="mt-5 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Refresh
              </button>
            </div>
          )}

          {/* Keep your original HostelCard grid as a hidden fallback */}
          <div className="hidden">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((hostel) => (
                <div key={hostel.id} className="transition-transform duration-200 hover:-translate-y-0.5">
                  <HostelCard hostel={hostel} onClick={() => onNavigate("detail", hostel.id)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
