import { Star, MapPin, Users, Check } from 'lucide-react';

interface HostelCardProps {
  hostel: any;
  onClick: () => void;
}

export default function HostelCard({ hostel, onClick }: HostelCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden cursor-pointer border border-gray-200 flex flex-col w-full"
    >
      <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shrink-0">
        <div className="text-gray-500 text-4xl">🏠</div>
        {hostel.verified && (
          <div className="absolute top-3 right-3 bg-[#DC143C] text-white px-3 py-1 rounded-full flex items-center gap-1 text-sm font-semibold shadow-sm">
            <Check className="w-4 h-4" />
            Verified
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-black mb-1 line-clamp-2 break-words">
          {hostel.name}
        </h3>

        {/* FIX: min-w-0 and truncate to prevent horizontal overflow on small screens */}
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 min-w-0">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{hostel.location}</span>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-[#DC143C] text-[#DC143C] shrink-0" />
            <span className="font-semibold text-black">
              {hostel.rating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500 truncate">
            ({hostel.review_count} reviews)
          </span>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1 text-sm text-gray-600 min-w-0">
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">{hostel.room_type}</span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-[#DC143C]">
              ${hostel.price_per_night}
            </div>
            <div className="text-xs text-gray-500">per night</div>
          </div>
        </div>
      </div>
    </div>
  );
}