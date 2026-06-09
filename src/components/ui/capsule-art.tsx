import { cn } from "@/lib/cn";
import { getProductIcon } from "@/lib/icons";
import type { ProductArt } from "@/lib/types";

const ratios = {
  wide: "aspect-[16/9]",
  tall: "aspect-[2/3]",
  square: "aspect-square",
  banner: "aspect-[21/9]",
} as const;

interface CapsuleArtProps {
  art: ProductArt;
  ratio?: keyof typeof ratios;
  className?: string;
  iconClassName?: string;
  /** 同一产品的"截图"变体：偏移渐变角度模拟不同画面 */
  variant?: number;
}

/** 程序化星云封装画 —— 全站统一的视觉签名，替代真实图片素材 */
export function CapsuleArt({ art, ratio = "wide", className, iconClassName, variant = 0 }: CapsuleArtProps) {
  const Icon = getProductIcon(art.icon);
  const angle = 135 + variant * 67;
  const { hueA, hueB } = art;

  return (
    <div
      className={cn(
        "grain relative isolate flex items-center justify-center overflow-hidden",
        ratios[ratio],
        className,
      )}
      style={{
        background: [
          `radial-gradient(120% 90% at ${15 + variant * 22}% 0%, hsl(${hueA} 80% 30% / .85), transparent 55%)`,
          `radial-gradient(110% 100% at ${88 - variant * 18}% 100%, hsl(${hueB} 75% 38% / .8), transparent 60%)`,
          `linear-gradient(${angle}deg, hsl(${hueA} 65% 13%), hsl(${hueB} 60% 19%))`,
        ].join(","),
      }}
    >
      {/* 高光弧 */}
      <div
        className="absolute inset-0"
        style={{
          background: `conic-gradient(from ${200 + variant * 40}deg at 70% 20%, transparent 70%, hsl(${hueA} 90% 70% / .14) 86%, transparent 100%)`,
        }}
      />
      <Icon
        strokeWidth={1.25}
        className={cn("relative z-10 size-[34%] max-h-20 text-white/85", iconClassName)}
        style={{ filter: `drop-shadow(0 0 18px hsl(${hueA} 90% 65% / .55))` }}
      />
      {/* 底部压暗，保证叠字可读 */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
    </div>
  );
}
