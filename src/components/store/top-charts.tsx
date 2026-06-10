"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { PriceTag } from "@/components/store/product-card";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating, ratingVerdict } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

export interface ChartTab {
  key: string;
  label: string;
  products: Product[];
}

/** Steam 标志性的「热门/新品…」榜单组件：左侧标签页+行列表，右侧悬停弹出大预览 */
export function TopCharts({ tabs }: { tabs: ChartTab[] }) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const [hovered, setHovered] = useState<Product | null>(active?.products[0] ?? null);
  const preview = hovered ?? active?.products[0] ?? null;

  if (!active) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">排行榜</h2>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* 左：标签页 + 行列表 */}
        <div className="capsule overflow-hidden">
          <div className="flex border-b border-line">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveKey(tab.key);
                  setHovered(tab.products[0] ?? null);
                }}
                className={cn(
                  "flex-1 px-3 py-2.5 text-sm font-medium transition-colors",
                  tab.key === active.key
                    ? "border-b-2 border-accent bg-accent/5 text-accent"
                    : "text-dim hover:bg-card-hi hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-line/70">
            {active.products.slice(0, 8).map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.slug}`}
                  onMouseEnter={() => setHovered(p)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 transition-colors",
                    preview?.id === p.id ? "bg-accent/5" : "hover:bg-card-hi",
                  )}
                >
                  <span className="w-5 shrink-0 text-center text-sm font-semibold text-mute">{i + 1}</span>
                  <CapsuleArt art={p.art} ratio="wide" className="w-16 shrink-0 rounded ring-1 ring-line" iconClassName="size-1/3" />
                  <div className="min-w-0 grow">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-mute">{p.tags.slice(0, 3).join(" · ") || p.developer}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <span className={cn("block text-xs font-medium", verdictTone(p.rating.score))}>
                      {ratingVerdict(p.rating.score).label}
                    </span>
                    <PriceTag price={p.price} className="text-[11px]" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 右：悬停预览弹出 */}
        {preview && (
          <Link
            href={`/p/${preview.slug}`}
            className="capsule hidden flex-col overflow-hidden lg:flex"
            key={preview.id}
          >
            <div className="animate-[fade-up_.25s_ease_both]">
              <CapsuleArt art={preview.art} ratio="wide" iconClassName="max-h-16" />
              <div className="space-y-2.5 p-3.5">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold">{preview.name}</h3>
                  <TypeBadge type={preview.type} />
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-dim">{preview.tagline}</p>
                {/* 截图缩略 */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((v) => (
                    <CapsuleArt key={v} art={preview.art} ratio="wide" variant={v + 1} className="w-1/3 rounded ring-1 ring-line" iconClassName="size-1/3" />
                  ))}
                </div>
                <Rating score={preview.rating.score} count={preview.rating.count} className="text-xs" />
                <div className="flex flex-wrap gap-1">
                  {preview.tags.slice(0, 4).map((t) => (
                    <span key={t} className="rounded bg-card-hi px-1.5 py-0.5 text-[11px] text-dim">{t}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1 text-xs text-mute">
                    <Download className="size-3" /> {preview.acquisitions.toLocaleString("zh-CN")}
                  </span>
                  <PriceTag price={preview.price} className="text-sm" />
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

function verdictTone(score: number): string {
  const t = ratingVerdict(score).tone;
  return t === "good" ? "text-good" : t === "mixed" ? "text-warn" : "text-danger";
}
