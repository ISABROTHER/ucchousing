type: uploaded file
fileName: isabrother/ucchousing/ucchousing-fafe98b41c4ceee58b28d074e4da28c1e8941cd5/src/components/HostelCard.tsx
fullContent:
import { useMemo } from 'react';
import { 
  Star, 
  MapPin, 
  Users, 
  Check, 
  Zap, 
  TrendingUp, 
  Bell, 
  Sparkles 
} from 'lucide-react';

interface HostelCardProps {
  hostel: any;
  onClick: () => void;
}

export default function HostelCard({ hostel, onClick }: HostelCardProps) {
  // --------------------------------------------------------------------------
  // VIBE LOGIC: Simulate availability states to demonstrate the UI features
  // In a real app, these would come from the 'hostel' prop directly.
  // --------------------------------------------------------------------------
  const { status, config } = useMemo(() => {
    // Generate a deterministic "random" state based on the hostel ID
    const idSum = (hostel.id || '0')
      .toString()
      .split('')
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    
    // Define the possible states
    const states = ['available', 'low', 'hot', 'full'];
    const currentState = states[idSum % states.length];

    // Configure the UI based on the state
    switch (currentState) {
      case 'low':
        return {
          status: 'low',
          config: {
            theme: 'amber',
            barColor: 'bg-amber-500',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-700',
            label: 'Only 3 rooms left',
            capacity: 80,
            icon: Zap,
            pulse: true,
            btnText: 'Book Now',
            btnColor: 'bg-[#DC143C]', // Brand Red
          }
        };
      case 'hot':
        return {
          status: 'hot',
          config: {
            theme: 'red',
            barColor: 'bg-[#DC143C]',
            bgColor: 'bg-rose-50',
            textColor: 'text-[#DC143C]',
            label: 'Selling Fast',
            capacity: 92,
            icon: TrendingUp,
            pulse: true,
            btnText: 'Book Now',
            btnColor: 'bg-[#DC143C]',
          }
        };
      case 'full':
        return {
          status: 'full',
          config: {
            theme: 'slate',
            barColor: 'bg-red-600',
            bgColor: 'bg-slate-100',
            textColor: 'text-red-700',
            label: 'Fully Booked',
            capacity: 100,
            icon: Bell,
            pulse: false,
            btnText: 'Notify Me',
            btnColor: 'bg-slate-800',
            isStripe: true
          }
        };
      case 'available':
      default:
        return {
          status: 'available',
          config: {
            theme: 'emerald',
            barColor: 'bg-emerald-500',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-700',
            label: 'Available',
            capacity: 35,
            icon: Check,
            pulse: false,
            btnText: 'Book Now',
            btnColor: 'bg-[#DC143C]',
          }
        };
    }
  }, [hostel.id]);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-200 flex flex-col w-full relative"
    >
      {/* 1. IMAGE AREA */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {/* Placeholder or Image */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
          <span className="text-4xl select-none">🏠</span>
        </div>
        
        {/* Top Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {hostel.verified && (
            <div className="bg-white/95 backdrop-blur-sm text-[#DC143C] px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold shadow-sm ring-1 ring-black/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC143C]"></span>
              </span>
              Verified
            </div>
          )}
        </div>
      </div>

      {/* 2. NAME SECTION (On its own line at top) */}
      <div className="pt-4 px-4 pb-2">
        <h3 className="text-xl font-bold text-slate-900 leading-tight line-clamp-1 group-hover:text-[#DC143C] transition-colors">
          {hostel.name}
        </h3>
      </div>

      {/* 3. FULL-WIDTH AVAILABILITY BAR (Edge-to-Edge) */}
      <div className={`w-full relative h-10 ${config.bgColor} overflow-hidden flex items-center`}>
        {/* Background Progress Bar */}
        <div 
          className={`absolute left-0 top-0 bottom-0 ${config.barColor} transition-all duration-1000 ease-out opacity-20`}
          style={{ width: `${config.capacity}%` }}
        />
        
        {/* Diagonal Stripes for Full/High */}
        {config.isStripe && (
           <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,#000_25%,#000_50%,transparent_50%,transparent_75%,#000_75%,#000_100%)] bg-[length:20px_20px]" />
        )}

        {/* Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full animate-[pulse_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Content Inside Bar */}
        <div className="relative w-full px-4 flex items-center justify-between z-10">
          {/* Left: Status Indicator */}
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${config.textColor}`}>
            {config.pulse ? (
               <div className="relative">
                 <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-current"></div>
                 <config.icon className="w-4 h-4 relative z-10" />
               </div>
            ) : (
              <config.icon className="w-4 h-4" />
            )}
            <span>{config.label}</span>
          </div>

          {/* Right: Action Button */}
          <button className={`
            flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm
            transform transition-all active:scale-95 hover:brightness-110
            ${config.btnColor}
          `}>
            {status === 'hot' && <Sparkles className="w-3 h-3" />}
            {config.btnText}
          </button>
        </div>
      </div>

      {/* 4. DETAILS SECTION */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Location (Moved below bar) */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
          <MapPin className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="truncate">{hostel.location}</span>
        </div>

        {/* Rating & Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-slate-900">{hostel.rating.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">({hostel.review_count})</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            Updated 2h ago
          </div>
        </div>

        {/* Footer: Type & Price */}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[80px]">{hostel.room_type}</span>
          </div>
          
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold text-[#DC143C]">
                ${hostel.price_per_night}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">/night</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}