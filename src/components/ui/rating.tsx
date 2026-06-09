import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Steam 式总评措辞 */
export function ratingVerdict(score: number): { label: string; tone: "good" | "mixed" | "bad" } {
  if (score >= 4.7) return { label: "好评如潮", tone: "good" };
  if (score >= 4.0) return { label: "特别好评", tone: "good" };
  if (score >= 3.5) return { label: "多半好评", tone: "good" };
  if (score >= 2.5) return { label: "褒贬不一", tone: "mixed" };
  return { label: "多半差评", tone: "bad" };
}

const toneClass = {
  good: "text-aurora",
  mixed: "text-gold",
  bad: "text-danger",
} as const;

interface RatingProps {
  score: number;
  count?: number;
  showVerdict?: boolean;
  className?: string;
}

export function Rating({ score, count, showVerdict = true, className }: RatingProps) {
  const verdict = ratingVerdict(score);
  return (
    <div className={cn("flex items-center gap-1.5 text-sm", className)}>
      <span className="flex items-center gap-0.5 text-gold">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={cn("size-3.5", i < Math.round(score) ? "fill-gold" : "fill-transparent opacity-30")}
          />
        ))}
      </span>
      <span className="font-display font-semibold text-ink">{score.toFixed(1)}</span>
      {showVerdict && <span className={cn("font-medium", toneClass[verdict.tone])}>{verdict.label}</span>}
      {count !== undefined && (
        <span className="text-mute">({count.toLocaleString("zh-CN")} 篇评测)</span>
      )}
    </div>
  );
}
