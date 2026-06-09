import { cn } from "@/lib/cn";
import type { ProductType } from "@/lib/types";

export const typeMeta: Record<ProductType, { label: string; className: string }> = {
  app: { label: "应用", className: "text-accent bg-accent/8" },
  model: { label: "模型", className: "text-purple bg-purple/8" },
  agent: { label: "Agent", className: "text-green bg-green/8" },
  skill: { label: "Skill", className: "text-warn bg-warn/8" },
  tutorial: { label: "教程", className: "text-[#c2417e] bg-[#c2417e]/8" },
  video: { label: "视频", className: "text-[#c05621] bg-[#c05621]/8" },
};

export function TypeBadge({ type, className }: { type: ProductType; className?: string }) {
  const meta = typeMeta[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
