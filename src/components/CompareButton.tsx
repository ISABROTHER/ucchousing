import { GitCompareArrows } from "lucide-react";

interface CompareButtonProps {
  hostelId: string;
  isInCompare: boolean;
  compareCount: number;
  onToggle: (hostelId: string) => void;
  size?: "sm" | "md";
}

export default function CompareButton({
  hostelId,
  isInCompare,
  compareCount,
  onToggle,
  size = "md",
}: CompareButtonProps) {
  const isFull = compareCount >= 3 && !isInCompare;
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const btnSize = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isFull) onToggle(hostelId);
      }}
      disabled={isFull}
      className={`${btnSize} rounded-full transition-all duration-200 ${
        isInCompare
          ? "bg-sky-50 text-sky-600 shadow-sm"
          : isFull
            ? "bg-white/80 text-gray-300 cursor-not-allowed"
            : "bg-white/80 backdrop-blur-sm text-gray-400 hover:text-sky-600 hover:bg-sky-50"
      }`}
      title={isInCompare ? "Remove from compare" : isFull ? "Compare list full (3 max)" : "Add to compare"}
    >
      <GitCompareArrows className={iconSize} />
    </button>
  );
}
