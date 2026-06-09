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
  /** 同一产品的"截图"变体：渐变角度/明度偏移模拟不同画面 */
  variant?: number;
}

/** 程序化封面：柔和双色渐变 + 图标，替代真实图片素材 */
export function CapsuleArt({ art, ratio = "wide", className, iconClassName, variant = 0 }: CapsuleArtProps) {
  const Icon = getProductIcon(art.icon);
  const angle = 135 + variant * 40;
  const { hueA, hueB } = art;

  return (
    <div
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden",
        ratios[ratio],
        className,
      )}
      style={{
        background: `linear-gradient(${angle}deg, hsl(${hueA} 60% ${88 - variant * 3}%), hsl(${hueB} 55% ${76 - variant * 3}%))`,
      }}
    >
      <Icon
        strokeWidth={1.5}
        className={cn("relative size-[30%] max-h-16", iconClassName)}
        style={{ color: `hsl(${hueA} 45% 36%)` }}
      />
    </div>
  );
}
