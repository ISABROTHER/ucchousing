import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleWishlist } from "../lib/wishlist";

interface WishlistButtonProps {
  hostelId: string;
  userId: string | null;
  isWishlisted: boolean;
  onToggle: (hostelId: string, newState: boolean) => void;
  size?: "sm" | "md";
}

export default function WishlistButton({
  hostelId,
  userId,
  isWishlisted,
  onToggle,
  size = "md",
}: WishlistButtonProps) {
  const [loading, setLoading] = useState(false);
  const [animate, setAnimate] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!userId || loading) return;

    setLoading(true);
    setAnimate(true);
    setTimeout(() => setAnimate(false), 400);

    try {
      await toggleWishlist(userId, hostelId, isWishlisted);
      onToggle(hostelId, !isWishlisted);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      onClick={handleClick}
      disabled={!userId}
      className={`${btnSize} rounded-full transition-all duration-200 ${
        isWishlisted
          ? "bg-red-50 text-[#DC143C] shadow-sm"
          : "bg-white/80 backdrop-blur-sm text-gray-400 hover:text-[#DC143C] hover:bg-red-50"
      } ${animate ? "scale-125" : "scale-100"} ${!userId ? "opacity-40 cursor-not-allowed" : ""}`}
      title={userId ? (isWishlisted ? "Remove from saved" : "Save hostel") : "Sign in to save"}
    >
      <Heart
        className={`${iconSize} transition-all ${isWishlisted ? "fill-[#DC143C]" : ""}`}
      />
    </button>
  );
}
