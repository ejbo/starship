"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { typeMeta } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product, ProductType } from "@/lib/types";

const TYPE_ORDER: ProductType[] = ["app", "model", "agent", "skill", "tutorial", "video"];
const SORTS: [string, string][] = [
  ["downloads", "热门"],
  ["new", "最新"],
  ["rating", "高分"],
  ["name", "名称"],
];
const PRICES: ["all" | "free" | "paid", string][] = [
  ["all", "全部"],
  ["free", "免费"],
  ["paid", "点数"],
];

export function BrowseExplorer({
  products,
  initialQuery = "",
  initialType = "all",
}: {
  products: Product[];
  initialQuery?: string;
  initialType?: ProductType | "all";
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState<ProductType | "all">(initialType);
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");
  const [sort, setSort] = useState("downloads");

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map((e) => e[0]);
  }, [products]);

  const typeCounts = useMemo(() => {
    const m = new Map<ProductType, number>();
    for (const p of products) m.set(p.type, (m.get(p.type) ?? 0) + 1);
    return m;
  }, [products]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((p) => {
      if (type !== "all" && p.type !== type) return false;
      if (price === "free" && p.price !== "free") return false;
      if (price === "paid" && p.price === "free") return false;
      if (tags.length && !tags.every((t) => p.tags.includes(t))) return false;
      if (q && ![p.name, p.tagline, p.developer, ...p.tags].some((s) => s.toLowerCase().includes(q))) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "new") return b.releasedAt.localeCompare(a.releasedAt);
      if (sort === "rating") return b.rating.score - a.rating.score;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.acquisitions - a.acquisitions;
    });
  }, [products, query, type, tags, price, sort]);

  const toggleTag = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  const hasFilters = type !== "all" || tags.length > 0 || price !== "all" || query.trim() !== "";
  const reset = () => {
    setType("all");
    setTags([]);
    setPrice("all");
    setQuery("");
  };

  const filterBtn = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
      active ? "bg-accent/8 font-medium text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
    );

  return (
    <div className="space-y-5">
      {/* 搜索框 */}
      <label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2.5 focus-within:border-accent">
        <Search className="size-4 text-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索应用、模型、Agent、开发者…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-mute focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-mute hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </label>

      <div className="grid gap-6 lg:grid-cols-[212px_1fr]">
        {/* 筛选侧栏 */}
        <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-mute">
              <SlidersHorizontal className="size-3.5" /> 类型
            </p>
            <div className="flex flex-col gap-0.5">
              <button onClick={() => setType("all")} className={filterBtn(type === "all")}>
                全部 <span className="text-mute">{products.length}</span>
              </button>
              {TYPE_ORDER.filter((t) => typeCounts.get(t)).map((t) => (
                <button key={t} onClick={() => setType(t)} className={filterBtn(type === t)}>
                  {typeMeta[t].label} <span className="text-mute">{typeCounts.get(t)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-mute">价格</p>
            <div className="flex flex-col gap-0.5">
              {PRICES.map(([v, l]) => (
                <button key={v} onClick={() => setPrice(v)} className={filterBtn(price === v)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-mute">标签</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                      tags.includes(t)
                        ? "border-accent bg-accent/8 text-accent"
                        : "border-line text-dim hover:border-accent/40 hover:text-ink",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 结果 */}
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-dim">{results.length} 个结果</span>
            {hasFilters && (
              <button onClick={reset} className="flex items-center gap-1 text-xs text-mute hover:text-accent">
                <X className="size-3" /> 清除筛选
              </button>
            )}
            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="text-mute">排序</span>
              {SORTS.map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setSort(v)}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    sort === v ? "bg-accent/8 font-medium text-accent" : "text-dim hover:bg-card-hi",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <p className="capsule p-12 text-center text-sm text-dim">没有匹配的产品，换个条件试试。</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} className="w-full" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
