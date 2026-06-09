import Link from "next/link";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import type { Product } from "@/lib/types";

/** 星籍主页展柜：精选造物横排 */
export function Showcase({ products }: { products: Product[] }) {
  return (
    <div className="capsule p-5 hover:translate-y-0">
      <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
        展柜 <span className="font-display text-[10px] tracking-[0.25em] text-mute">SHOWCASE</span>
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} className="group block">
            <CapsuleArt
              art={p.art}
              ratio="wide"
              className="rounded-md ring-1 ring-line transition-all duration-200 group-hover:ring-aurora/50 group-hover:-translate-y-0.5"
              iconClassName="size-1/3"
            />
            <p className="mt-1.5 truncate text-xs font-medium group-hover:text-aurora transition-colors">{p.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <TypeBadge type={p.type} className="scale-90 origin-left" />
              <Rating score={p.rating.score} showVerdict={false} className="hidden text-[10px] sm:flex" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
