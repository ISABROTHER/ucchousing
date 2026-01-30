import { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  Star,
  AlertTriangle,
  Image as ImageIcon,
  MapPin,
  Camera,
} from "lucide-react";
import { getFeaturedHostels } from "../../lib/hostels";
import { PageType } from "../../App";

// --- Helpers ---
function getStringField(obj: any, key: string) {
  return typeof obj?.[key] === "string" ? obj[key] : undefined;
}

function getImageUrls(hostel: any): string[] {
  const arrays = [hostel.images, hostel.image_urls, hostel.photos];
  for (const v of arrays) if (Array.isArray(v) && v.length) return v;
  const singles = [hostel.main_image, hostel.cover_image, hostel.image];
  const found = singles.find((x) => typeof x === "string" && x);
  return found ? [found] : [];
}

const CARD_BG_CLASSES = [
  "bg-emerald-50 border-emerald-100",
  "bg-sky-50 border-sky-100",
  "bg-amber-50 border-amber-100",
  "bg-violet-50 border-violet-100",
  "bg-rose-50 border-rose-100",
  "bg-indigo-50 border-indigo-100",
];

// --- Modified Card Component with Interactive Gallery ---
function FeaturedPhotoMosaicCard({
  hostel,
  onOpen,
  colorClassName,
}: {
  hostel: any;
  onOpen: () => void;
  colorClassName: string;
}) {
  const name = getStringField(hostel, "name") || "Featured hostel";
  const location = getStringField(hostel, "location") || getStringField(hostel, "address");
  const images = getImageUrls(hostel);

  // Ensure we have at least 4 images for the layout (1 Main + 3 Thumbnails)
  const safeImages = [...images];
  while (safeImages.length < 4 && safeImages.length > 0) {
    safeImages.push(safeImages[safeImages.length % safeImages.length]);
  }

  // State: Which image is currently displayed in the main hero slot?
  const [activeMain, setActiveMain] = useState(safeImages[0]);

  useEffect(() => {
    if (safeImages[0]) setActiveMain(safeImages[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostel.id]);

  const activeIndex = safeImages.indexOf(activeMain);
  const totalImages = safeImages.length;

  return (
    <div
      className={[
        "group/card flex flex-col rounded-[2rem] border-2 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 w-full max-w-full overflow-hidden",
        // FIX: less transparent / distinct card background, per-card color
        colorClassName,
        // keep your existing hover behaviors
        "hover:border-emerald-300 hover:bg-white",
      ].join(" ")}
    >
      {/* 1. INTERACTIVE GALLERY (Full Width / No Padding) */}
      <div className="flex flex-col gap-1 w-full">
        {/* TOP: Main Hero Image */}
        <button
          onClick={onOpen}
          className="w-full h-64 sm:h-80 relative bg-slate-200 cursor-pointer focus:outline-none group/image"
        >
          {activeMain && (
            <img
              src={activeMain}
              className="h-full w-full object-cover transition-transform duration-700 group-hover/image:scale-105"
              alt="Main View"
            />
          )}

          {/* Photo Counter */}
          <div className="absolute top-4 left-4 z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white shadow-sm border border-white/10">
              <Camera className="h-3 w-3" />
              <span>
                {Math.max(activeIndex, 0) + 1} / {totalImages}
              </span>
            </div>
          </div>

          {/* See photos Badge */}
          <div className="absolute bottom-4 right-4 z-10 max-w-[80%]">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white/90 backdrop-blur-sm border border-white/50 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105 whitespace-nowrap">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">See photos</span>
            </div>
          </div>
        </button>

        {/* BOTTOM: Scrollable Thumbnails Strip */}
        <div className="flex overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-4 sm:px-1 gap-1 h-20 sm:h-24 scrollbar-hide snap-x bg-white/40">
          {safeImages.map((thumb, idx) => {
            const isActive = activeMain === thumb;
            if (idx > 3) return <div key={idx} className="hidden sm:block"></div>;

            return (
              <button
                key={`${hostel.id}-thumb-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMain(thumb);
                }}
                className={`
                        relative flex-shrink-0 w-24 sm:w-auto h-full overflow-hidden rounded-md cursor-pointer transition-all snap-start
                        ${isActive ? "ring-2 ring-emerald-500 z-10" : "opacity-80 hover:opacity-100"}
                      `}
              >
                <img src={thumb} className="h-full w-full object-cover" alt={`View ${idx + 1}`} />
                {isActive && <div className="absolute inset-0 bg-emerald-500/10 mix-blend-overlay" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. DETAILS BELOW */}
      <button onClick={onOpen} className="p-5 pt-3 text-left focus:outline-none w-full">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 group-hover/card:text-emerald-700 transition-colors break-words">
              {name}
            </h3>
            {location && (
              <div className="mt-1.5 flex items-center gap-1.5 text-slate-600 text-sm font-medium">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
          <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover/card:text-emerald-500 group-hover/card:border-emerald-200 transition-colors shrink-0">
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </button>
    </div>
  );
}

// --- Main Component ---
interface HomeFeaturedProps {
  onNavigate: (page: PageType, hostelId?: string) => void;
}

export default function HomeFeatured({ onNavigate }: HomeFeaturedProps) {
  const [featured, setFeatured] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeatured = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFeaturedHostels(6);
      const list = Array.isArray(data) ? [...data] : [];

      // Manual data injection
      const manualHostels = [
        {
          id: "nana-agyoma-manual",
          name: "Nana Agyoma Hostel",
          address: "Amamoma, UCC",
          location: "Amamoma",
          main_image: "https://i.imgur.com/luYRCIq.jpeg",
          images: [
            "https://i.imgur.com/luYRCIq.jpeg",
            "https://i.imgur.com/peh4mP5.jpeg",
            "https://i.imgur.com/CKdT7Di.jpeg",
            "https://i.imgur.com/Ci2Vn7D.jpeg",
          ],
        },
        // REMOVED Success City Hostel as requested
        {
          id: "adoration-home-plus-manual",
          name: "Adoration Home Plus Hostel",
          address: "Ayensu, UCC",
          location: "Ayensu",
          main_image: "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
          images: [
            "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png",
            "https://getrooms.co/wp-content/uploads/2022/10/adoration1-300x300.jpg",
            "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1-300x300.png",
            "https://getrooms.co/wp-content/uploads/2022/10/adoration-main1.png", // Repeated to fill the layout
          ],
        },
      ];

      const existing = new Set(list.map((h: any) => h.name?.toLowerCase()));
      manualHostels.forEach((m) => {
        if (!existing.has(m.name.toLowerCase())) list.push(m);
      });

      setFeatured(list);
    } catch {
      setError("We could not load featured hostels right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeatured();
  }, []);

  const colorClassesById = useMemo(() => {
    const map = new Map<string, string>();
    featured.forEach((h, i) => {
      const id = String(h?.id ?? i);
      map.set(id, CARD_BG_CLASSES[i % CARD_BG_CLASSES.length]);
    });
    return map;
  }, [featured]);

  return (
    <div className="mt-16 mx-auto max-w-5xl px-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Featured hostels</h2>
          <p className="text-slate-500 mt-2 font-medium">
            Curated picks for the best student living experience.
          </p>
        </div>

        <button
          onClick={() => onNavigate("search")}
          className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-900 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98]"
        >
          View all listings <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 flex flex-col items-center justify-center text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-base font-bold text-rose-900">{error}</p>
            <button
              onClick={() => void loadFeatured()}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition shadow-sm"
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-[2rem] border-2 border-slate-100 bg-white p-4">
              <div className="h-80 w-full bg-slate-200 rounded-[1.5rem] mb-4"></div>
              <div className="h-6 w-1/3 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : featured.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 w-full">
          {featured.map((hostel, idx) => {
            const id = String(hostel?.id ?? idx);
            const colorClassName =
              colorClassesById.get(id) ?? CARD_BG_CLASSES[idx % CARD_BG_CLASSES.length];

            return (
              <FeaturedPhotoMosaicCard
                key={hostel.id}
                hostel={hostel}
                colorClassName={colorClassName}
                onOpen={() => onNavigate("detail", hostel.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-lg font-bold text-slate-900">No featured hostels yet</p>
          <button
            onClick={() => void loadFeatured()}
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
