import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import type { Product } from "@/lib/types";

interface SectionRowProps {
  title: string;
  products: Product[];
}

/** 分类行：标题 + 横向滚动卡片列 */
export function SectionRow({ title, products }: SectionRowProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline">
        <h2 className="text-lg font-bold">{title}</h2>
        <button className="ml-auto flex items-center gap-0.5 text-xs text-dim transition-colors hover:text-accent">
          查看全部 <ChevronRight className="size-3.5" />
        </button>
      </div>
      <div className="scrollbar-hide -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
