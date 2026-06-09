import Link from "next/link";
import { Download } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  className?: string;
}

/** 商店卡片：hover 浮起 + 辉光 + 滑出速览条（Steam hover 预览的轻量版） */
export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <Link
      href={`/p/${product.slug}`}
      className={cn("capsule group block w-64 shrink-0 snap-start overflow-hidden", className)}
    >
      <div className="relative">
        <CapsuleArt art={product.art} ratio="wide" />
        {/* 速览条 */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 via-black/70 to-transparent px-3 pt-6 pb-2 text-xs text-ink/90 transition-transform duration-200 group-hover:translate-y-0">
          <p className="line-clamp-2">{product.tagline}</p>
          <p className="mt-1 flex items-center gap-1 text-dim">
            <Download className="size-3" />
            {product.acquisitions.toLocaleString("zh-CN")} 次获取
          </p>
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold group-hover:text-aurora transition-colors">
            {product.name}
          </h3>
          <TypeBadge type={product.type} />
        </div>
        <Rating score={product.rating.score} showVerdict={false} className="text-xs" />
        <p className="truncate text-xs text-mute">{product.tags.slice(0, 3).join(" · ")}</p>
      </div>
    </Link>
  );
}
