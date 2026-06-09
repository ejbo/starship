import Link from "next/link";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import type { Product } from "@/lib/types";

/** 个人主页展柜：精选产品横排 */
export function Showcase({ products }: { products: Product[] }) {
  return (
    <div className="capsule p-5">
      <h3 className="mb-3 text-sm font-semibold">展柜</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p) => (
          <Link key={p.id} href={`/p/${p.slug}`} className="group block">
            <CapsuleArt
              art={p.art}
              ratio="wide"
              className="rounded-md ring-1 ring-line transition-all duration-150 group-hover:ring-accent/50"
              iconClassName="size-1/3"
            />
            <p className="mt-1.5 truncate text-xs font-medium transition-colors group-hover:text-accent">{p.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <TypeBadge type={p.type} className="origin-left scale-90" />
              <Rating score={p.rating.score} showVerdict={false} className="hidden text-[10px] sm:flex" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
