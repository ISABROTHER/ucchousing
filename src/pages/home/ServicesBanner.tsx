import { Shirt, FileText, Zap, ChevronRight } from "lucide-react";
import { PageType } from "../../App";

interface ServicesBannerProps {
  onNavigate: (page: PageType) => void;
}

const SERVICES = [
  {
    page: "laundry" as PageType,
    icon: Shirt,
    title: "Smart Laundry",
    subtitle: "Pickup & delivery",
    color: "from-sky-500 to-cyan-600",
    bg: "bg-sky-50",
    text: "text-sky-700",
    badge: "New",
  },
  {
    page: "tenancy" as PageType,
    icon: FileText,
    title: "Tenancy & Rent",
    subtitle: "Digital agreements",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: null,
  },
  {
    page: "utilities" as PageType,
    icon: Zap,
    title: "Utility Top-Up",
    subtitle: "ECG · GWCL · Split bills",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: null,
  },
];

export default function ServicesBanner({ onNavigate }: ServicesBannerProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Campus Services</h2>
        <span className="text-xs text-gray-400 font-medium">Exclusive to StaySync</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SERVICES.map((svc) => (
          <button
            key={svc.page}
            type="button"
            onClick={() => onNavigate(svc.page)}
            className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${svc.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
            <div className="flex items-start justify-between gap-2">
              <div className={`w-11 h-11 rounded-xl ${svc.bg} flex items-center justify-center flex-shrink-0`}>
                <svc.icon className={`w-5 h-5 ${svc.text}`} />
              </div>
              <div className="flex items-center gap-1.5">
                {svc.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${svc.bg} ${svc.text}`}>
                    {svc.badge}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </div>
            <div className="mt-3">
              <p className="font-bold text-gray-900">{svc.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{svc.subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
