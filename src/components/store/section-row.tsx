import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import type { Product } from "@/lib/types";

interface SectionRowProps {
  title: string;
  en: string;
  products: Product[];
  delay?: number;
}

/** 分类星轨：标题 + 横向滚动卡片列 */
export function SectionRow({ title, en, products, delay = 0 }: SectionRowProps) {
  return (
    <section
      className="animate-[fade-up_.6s_ease_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="font-display text-[10px] font-semibold tracking-[0.25em] text-mute">{en}</span>
        <button className="ml-auto flex items-center gap-0.5 text-xs text-dim transition-colors hover:text-aurora">
          查看全部 <ChevronRight className="size-3.5" />
        </button>
      </div>
      <div className="scrollbar-hide -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pt-1 pb-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
