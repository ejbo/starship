import Link from "next/link";
import { Compass, ChevronRight } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import type { Product } from "@/lib/types";

/** 发现队列：根据库与评分挑选的每日推荐入口 */
export function DiscoveryQueue({ products }: { products: Product[] }) {
  const first = products[0];
  const preview = products.slice(0, 4);
  if (!first) return null;

  return (
    <section>
      <Link href={`/p/${first.slug}`} className="capsule group flex items-center gap-4 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent/8">
          <Compass className="size-5.5 text-accent" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold">今日发现队列</h3>
          <p className="truncate text-sm text-dim">
            为你挑选了 {products.length} 个产品 —— 从《{first.name}》开始探索
          </p>
        </div>
        <div className="ml-auto hidden items-center sm:flex">
          {preview.map((p, i) => (
            <CapsuleArt
              key={p.id}
              art={p.art}
              ratio="square"
              className="-ml-2.5 w-12 rounded-md ring-2 ring-panel first:ml-0"
              iconClassName="size-1/2"
              variant={i}
            />
          ))}
          <ChevronRight className="ml-3 size-5 text-mute transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
      </Link>
    </section>
  );
}
