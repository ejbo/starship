import Link from "next/link";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

export function PriceTag({ price, className }: { price: Product["price"]; className?: string }) {
  return price === "free" ? (
    <span className={cn("text-xs font-medium text-free", className)}>免费</span>
  ) : (
    <span className={cn("text-xs font-medium text-dim", className)}>{price.credits} 点数</span>
  );
}

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  return (
    <Link
      href={`/p/${product.slug}`}
      className={cn("capsule group block w-60 shrink-0 snap-start overflow-hidden", className)}
    >
      <CapsuleArt art={product.art} ratio="wide" />
      <div className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-accent">
            {product.name}
          </h3>
          <TypeBadge type={product.type} />
        </div>
        <p className="truncate text-xs text-dim">{product.tagline}</p>
        <div className="flex items-center justify-between pt-0.5">
          <Rating score={product.rating.score} showVerdict={false} className="text-xs" />
          <PriceTag price={product.price} />
        </div>
      </div>
    </Link>
  );
}
