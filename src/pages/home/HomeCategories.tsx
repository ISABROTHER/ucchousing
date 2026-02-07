import { useState, useEffect, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { getHostels } from "../../lib/hostels";
import { PageType } from "../../App";

// --- Types & Helpers ---
type HousingKey = "New Site" | "Old Site" | "Outside Campus" | "Traditional Halls";

type HousingTypeCard = {
  title: HousingKey;
  image: string;
  badge: string;
};

const HOUSING_TYPES: HousingTypeCard[] = [
  {
    title: "New Site",
    image: "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
  {
    title: "Old Site",
    image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
  {
    title: "Outside Campus",
    image: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=800&auto=format&fit=crop",
    badge: "Off campus",
  },
  {
    title: "Traditional Halls",
    image: "https://images.unsplash.com/photo-1595846519845-68e298c2edd8?q=80&w=800&auto=format&fit=crop",
    badge: "On campus",
  },
];

function getStringField(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function inferHousingKey(hostel: any): HousingKey | undefined {
  const ht = getStringField(hostel, "housing_type");
  if (ht) {
    const map: Record<string, HousingKey> = {
      new_site: "New Site",
      old_site: "Old Site",
      outside_campus: "Outside Campus",
      traditional_halls: "Traditional Halls",
    };
    if (map[ht]) return map[ht];
  }

  const location = (getStringField(hostel, "location") || "").toLowerCase();
  if (location.includes("new site")) return "New Site";
  if (location.includes("old site")) return "Old Site";
  if (location.includes("main campus") || location.includes("traditional")) return "Traditional Halls";
  return "Outside Campus";
}

function formatCount(count: number): string {
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`;
  return `${count}`;
}

// --- Component ---
interface HomeCategoriesProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomeCategories({ onNavigate }: HomeCategoriesProps) {
  const [countsLoading, setCountsLoading] = useState<boolean>(true);
  const [countsError, setCountsError] = useState<string>("");
  const [countsByType, setCountsByType] = useState<Record<HousingKey, number>>({
    "New Site": 0,
    "Old Site": 0,
    "Outside Campus": 0,
    "Traditional Halls": 0,
  });
  
  // Animation state
  const [isVisible, setIsVisible] = useState(false);

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
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    void loadCounts();
    // Trigger animation after a tiny delay to ensure mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const housingTypes = useMemo(() => HOUSING_TYPES, []);

  return (
    <div className="mx-auto max-w-5xl px-4 mt-12">
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
        {countsError && <p className="mt-3 text-sm font-bold text-rose-700">{countsError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {housingTypes.map((type, index) => {
          const count = countsByType[type.title] ?? 0;

          return (
            // Animation Wrapper
            <div 
                key={type.title}
                className={`transform transition-all duration-700 ease-out ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
            >
                <button
                onClick={() => onNavigate("search")}
                className="group relative h-full w-full flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
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
                        {countsLoading ? "..." : `${formatCount(count)} listed`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm font-extrabold text-emerald-700 transition group-hover:text-emerald-800">
                        View
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    </div>
                </div>
                </button>
            </div>
          );
        })}
      </div>
    </div>
  );
} 