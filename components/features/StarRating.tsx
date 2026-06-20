import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Display a read-only star rating.
 * Renders 5 stars filled according to the `value` (0–5, supports half-fraction display).
 */
export function StarRating({
  value,
  size = 16,
  className,
  showNumber = false,
}: {
  value: number;
  size?: number;
  className?: string;
  showNumber?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;
        return (
          <Star
            key={star}
            width={size}
            height={size}
            className={
              filled || half
                ? "fill-yellow-400 text-yellow-400"
                : "fill-transparent text-muted-foreground/40"
            }
          />
        );
      })}
      {showNumber && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
