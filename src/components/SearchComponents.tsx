import { ReactNode } from "react";
import {
  MapPin,
  Image as ImageIcon,
  Sparkles,
  X,
  BedDouble,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { type IndexedHostel, TextUtils, Indexer, IntentParser } from "../../lib/search";

// --- Time Helpers for UI ---
function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  return `${wk}w ago`;
}

// --- Availability Logic for UI ---
type AvailabilityStatus = "unknown" | "full" | "low" | "medium" | "high";

function getAvailabilityNumber(hostel: any): number | null {
  const raw =
    hostel?.beds_available ??
    hostel?.rooms_available ??
    hostel?.available_rooms ??
    hostel?.availability_count ??
    hostel?.roomsLeft ??
    hostel?.rooms_left;

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const m = raw.replace(/,/g, "").match(/(\d+)/);
    if (m) return Number(m[1]);
  }
  return null;
}

function getAvailabilityStatus(n: number | null): AvailabilityStatus {
  if (n == null) return "unknown";
  if (n <= 0) return "full";
  if (n <= 2) return "low";
  if (n <= 5) return "medium";
  return "high";
}

function getAvailabilityLabel(n: number | null): string {
  if (n == null) return "Check";
  if (n <= 0) return "Full";
  if (n <= 2) return "1–2";
  if (n <= 5) return "3–5";
  return "6+";
}

function getAvailabilitySubLabel(n: number | null): string {
  if (n == null) return "Availability";
  if (n <= 0) return "No rooms";
  return "Rooms Left";
}

function getAvailabilityUpdatedAt(hostel: any): Date | null {
  const raw = hostel?.availability_updated_at ?? hostel?.availabilityUpdatedAt ?? hostel?.updated_at ?? hostel?.updatedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isAvailabilityVerified(hostel: any): boolean {
  const v = hostel?.availability_verified ?? hostel?.availabilityVerified ?? hostel?.verified;
  if (typeof v === "boolean") return v;
  const source = String(hostel?.availability_source ?? hostel?.availabilitySource ?? hostel?.source ?? "").toLowerCase();
  if (source.includes("manager") || source.includes("admin") || source.includes("owner")) return true;
  return false;
}

// --- Components ---

export function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition"
      type="button"
    >
      <span className="max-w-[240px] truncate">{label}</span>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <X className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

export function SearchMosaicCard({
  item,
  onOpen,
  query,
}: {
  item: IndexedHostel;
  onOpen: () => void;
  query: string;
}) {
  const images = Indexer.getImageUrls(item.hostel);
  const safeImages = [...images];
  while (safeImages.length < 5 && safeImages.length > 0) safeImages.push(safeImages[0]);
  const [a, b, c, d, e] = safeImages;

  const unitLabel = item.priceUnit === "month" ? "/mo" : item.priceUnit === "semester" ? "/sem" : item.priceUnit === "year" ? "/yr" : item.priceUnit === "day" ? "/day" : "";
  const showPrice = item.price != null;

  const chips: string[] = [];
  if (showPrice) chips.push(`From ${item.price!.toLocaleString()}${unitLabel}`);
  if (item.roomTypeN.includes("self-contained") || item.roomTypeN.includes("self con")) chips.push("Self-contained");
  else if (item.roomTypeN.includes("shared") || item.roomTypeN.includes("2 in 1")) chips.push("Shared");
  else if (item.roomTypeN.includes("single")) chips.push("Single room");
  if (item.nearCampus) chips.push("Near campus");
  const hasWifi = IntentParser.AMENITY_SYNONYMS["wifi"].some((s) => item.amenityN.includes(TextUtils.normalize(s)));
  if (hasWifi) chips.push("Wi-Fi");

  const displayChips = chips.slice(0, 4);

  // Availability
  const availN = getAvailabilityNumber(item.hostel);
  const status = getAvailabilityStatus(availN);
  const label = getAvailabilityLabel(availN);
  const subLabel = getAvailabilitySubLabel(availN);
  const updatedAt = getAvailabilityUpdatedAt(item.hostel);
  const verified = isAvailabilityVerified(item.hostel);

  // Dynamic Theme
  const theme =
    status === "full"
      ? {
          nameHover: "group-hover/card:text-rose-700",
          icon: "text-rose-500",
          chip: "bg-rose-50 text-rose-800 border-rose-100",
          boxBg: "bg-rose-500",
          boxShadow: "shadow-rose-200",
          boxText: "text-white",
        }
      : status === "unknown"
      ? {
          nameHover: "group-hover/card:text-slate-900",
          icon: "text-slate-500",
          chip: "bg-slate-50 text-slate-800 border-slate-200",
          boxBg: "bg-slate-900",
          boxShadow: "shadow-slate-200",
          boxText: "text-white",
        }
      : status === "low"
      ? {
          nameHover: "group-hover/card:text-amber-700",
          icon: "text-amber-500",
          chip: "bg-amber-50 text-amber-800 border-amber-100",
          boxBg: "bg-amber-500",
          boxShadow: "shadow-amber-200",
          boxText: "text-white",
        }
      : {
          nameHover: "group-hover/card:text-emerald-700",
          icon: "text-emerald-500",
          chip: "bg-emerald-50 text-emerald-800 border-emerald-100",
          boxBg: "bg-emerald-500",
          boxShadow: "shadow-emerald-200",
          boxText: "text-white",
        };

  return (
    <div className="group/card flex flex-col gap-4 rounded-[2rem] border-2 border-slate-200 bg-white p-4 shadow-lg shadow-slate-100 transition-all duration-300 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10">
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.99] transition-transform"
        type="button"
      >
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-80 md:h-96">
          <div className="col-span-2 row-span-2 relative overflow-hidden bg-slate-200">
            {a ? <img src={a} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Main" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-10 w-10 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {b ? <img src={b} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 1" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {c ? <img src={c} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 2" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {d ? <img src={d} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 3" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
          <div className="col-span-1 row-span-1 relative overflow-hidden bg-slate-200">
            {e ? <img src={e} className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105" alt="Detail 4" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-slate-400" /></div>}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 z-10">
          <div className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 shadow-md transition-transform hover:scale-105">
            <ImageIcon className="h-4 w-4" />
            <span>See all photos</span>
          </div>
        </div>
      </button>

      <div className="px-2 pb-2">
        <div className="flex items-stretch justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className={`text-xl font-extrabold text-slate-900 leading-tight ${theme.nameHover} transition-colors mb-1`}>
                {TextUtils.highlight(item.name, query)}
              </h3>
              {(item.location || item.address) && (
                <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mb-3">
                  <MapPin className={`h-4 w-4 ${theme.icon} shrink-0`} />
                  <span className="truncate">{TextUtils.highlight(item.location || item.address, query)}</span>
                </div>
              )}
            </div>
            {displayChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-auto">
                {displayChips.map((c) => (
                  <span key={c} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${theme.chip}`}>
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col justify-end">
            {status === "full" ? (
              <div className={`flex flex-col items-center justify-center rounded-2xl ${theme.boxBg} p-3 ${theme.boxText} shadow-xl ${theme.boxShadow} min-w-[98px] text-center`}>
                <XCircle className="h-8 w-8 mb-1 opacity-90" />
                <div className="text-xs font-black uppercase tracking-wider">Full</div>
                {updatedAt && <div className="mt-1 text-[10px] font-bold opacity-90">Updated {timeAgo(updatedAt)}</div>}
              </div>
            ) : (
              <div className={`group/box relative flex flex-col items-center justify-center rounded-2xl ${theme.boxBg} p-3 ${theme.boxText} shadow-xl ${theme.boxShadow} transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden min-w-[98px] text-center`}>
                {status !== "unknown" && <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />}
                <div className="relative z-10">
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-90 mb-0.5">
                    {status === "unknown" ? "Check" : status === "low" ? "Hurry" : "Available"}
                  </div>
                  <div className={`text-3xl font-black leading-none tracking-tighter ${status === "low" ? "animate-pulse" : ""}`}>{label}</div>
                  <div className="text-[10px] font-bold opacity-90 leading-tight mt-0.5">
                    {subLabel.split(" ").map((w, i) => (<span key={i}>{w}{i === 0 ? <br /> : null}</span>))}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5">
                    {verified ? <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider"><CheckCircle className="h-3.5 w-3.5" />Verified</span> : status === "unknown" ? <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider"><AlertCircle className="h-3.5 w-3.5" />Ask</span> : <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wider"><BedDouble className="h-3.5 w-3.5" />Live</span>}
                  </div>
                  {updatedAt && <div className="mt-1 text-[10px] font-bold opacity-90 predicted">Updated {timeAgo(updatedAt)}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}