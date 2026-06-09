import { cn } from "@/lib/cn";
import type { ProductType } from "@/lib/types";

export const typeMeta: Record<ProductType, { label: string; en: string; className: string }> = {
  app: { label: "应用", en: "APP", className: "text-aurora border-aurora/40 bg-aurora/10" },
  model: { label: "模型", en: "MODEL", className: "text-nebula border-nebula/40 bg-nebula/10" },
  agent: { label: "Agent", en: "AGENT", className: "text-teal border-teal/40 bg-teal/10" },
  skill: { label: "Skill", en: "SKILL", className: "text-gold border-gold/40 bg-gold/10" },
  tutorial: { label: "互动教程", en: "TUTORIAL", className: "text-[#ff8fb8] border-[#ff8fb8]/40 bg-[#ff8fb8]/10" },
  video: { label: "视频", en: "VIDEO", className: "text-[#ffa06e] border-[#ffa06e]/40 bg-[#ffa06e]/10" },
};

export function TypeBadge({ type, className }: { type: ProductType; className?: string }) {
  const meta = typeMeta[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-display text-[10px] font-semibold tracking-widest",
        meta.className,
        className,
      )}
    >
      {meta.en}
      <span className="font-sans font-normal tracking-normal">{meta.label}</span>
    </span>
  );
}
