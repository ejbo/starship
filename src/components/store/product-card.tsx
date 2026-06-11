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
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {product.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-card-hi px-1.5 py-0.5 text-[10px] text-dim">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between pt-0.5">
          <Rating score={product.rating.score} showVerdict={false} className="text-xs" />
          <PriceTag price={product.price} />
        </div>
      </div>
    </Link>
  );
}
