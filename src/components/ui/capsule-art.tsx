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
  /** 同一产品的"截图"变体：>0 时优先取 screenshots[variant-1] */
  variant?: number;
}

/** 选图：截图变体 > banner（宽幅）> 方形封面 > banner 兜底 */
function pickImage(art: ProductArt, ratio: keyof typeof ratios, variant: number): string | undefined {
  if (variant > 0 && art.screenshots?.length) {
    return art.screenshots[(variant - 1) % art.screenshots.length];
  }
  if (ratio === "banner" || ratio === "wide") {
    return art.bannerUrl ?? art.capsuleUrl ?? art.screenshots?.[0];
  }
  return art.capsuleUrl ?? art.bannerUrl ?? art.screenshots?.[0];
}

/**
 * 产品封面：有真实媒体则铺图（object-cover），否则渐变色块 + 图标。
 * 渐变始终作为底色——即使图片加载失败也不会露白。
 */
export function CapsuleArt({ art, ratio = "wide", className, iconClassName, variant = 0 }: CapsuleArtProps) {
  const Icon = getProductIcon(art.icon);
  const angle = 135 + variant * 40;
  const { hueA, hueB } = art;
  const img = pickImage(art, ratio, variant);

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
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <Icon
          strokeWidth={1.5}
          className={cn("relative size-[30%] max-h-16", iconClassName)}
          style={{ color: `hsl(${hueA} 45% 36%)` }}
        />
      )}
    </div>
  );
}
