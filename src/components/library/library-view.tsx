"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Play, Search } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { typeMeta } from "@/components/ui/type-badge";
import { getProductIcon } from "@/lib/icons";
import { cn } from "@/lib/cn";
import { formatPlaytime, formatPlaytimeShort } from "@/lib/playtime";
import type { ProductArt, ProductType } from "@/lib/types";

export interface LibItem {
  slug: string;
  name: string;
  type: ProductType;
  art: ProductArt;
  developer: string;
  usageHours: number;
  usageMinutes: number;
  lastUsedAt: string | null;
  acquiredAt: string;
  hasEntry: boolean;
}

// 点击库里的应用 → 进入该应用的「库详情页」（Steam 式），而不是直接跳运行/商店页
const launchHref = (i: LibItem) => `/library/${i.slug}`;

type Sort = "recent" | "playtime" | "name";
const sorts: { key: Sort; label: string }[] = [
  { key: "recent", label: "最近使用" },
  { key: "playtime", label: "时长" },
  { key: "name", label: "名称" },
];

export function LibraryView({ items }: { items: LibItem[] }) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ProductType | "all">("all");
  const [sort, setSort] = useState<Sort>("recent");

  const typeCounts = useMemo(() => {
    const m = new Map<ProductType, number>();
    for (const i of items) m.set(i.type, (m.get(i.type) ?? 0) + 1);
    return m;
  }, [items]);

  const totalMinutes = items.reduce((s, i) => s + i.usageMinutes, 0);
  const recent = [...items].sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""));
  const hero = recent[0];
  const recentStrip = recent.slice(1, 6);

  const filtered = useMemo(() => {
    let list = items.filter((i) => i.name.includes(query) || i.developer.includes(query));
    if (activeType !== "all") list = list.filter((i) => i.type === activeType);
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "playtime") return b.usageMinutes - a.usageMinutes;
      return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    });
    return list;
  }, [items, query, activeType, sort]);

  return (
    <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
      {/* 侧栏 */}
      <aside className="space-y-3 self-start text-sm lg:sticky lg:top-18">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-page px-2.5 py-1.5 text-mute focus-within:border-accent">
          <Search className="size-3.5" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索库" className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none" />
        </label>
        <div className="space-y-0.5">
          <button
            onClick={() => setActiveType("all")}
            className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 transition-colors", activeType === "all" ? "bg-accent/8 font-medium text-accent" : "text-dim hover:bg-card-hi hover:text-ink")}
          >
            全部 <span className="text-xs">{items.length}</span>
          </button>
          {[...typeCounts.entries()].map(([type, count]) => {
            const Icon = getProductIcon(type === "app" ? "grid" : type === "model" ? "cpu" : type === "agent" ? "bot" : type === "skill" ? "wand" : type === "tutorial" ? "graduation" : "video");
            return (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors", activeType === type ? "bg-accent/8 font-medium text-accent" : "text-dim hover:bg-card-hi hover:text-ink")}
              >
                <Icon className="size-3.5" />
                {typeMeta[type].label}
                <span className="ml-auto text-xs text-mute">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="rounded-lg border border-line p-3 text-xs text-mute">
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5" /> 总时长 <span className="ml-auto font-semibold text-ink">{formatPlaytime(totalMinutes)}</span>
          </p>
        </div>
      </aside>

      <div className="min-w-0 space-y-8">
        {/* 最近游玩 hero */}
        {hero && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-dim">最近游玩</h2>
            <div className="capsule grid overflow-hidden md:grid-cols-[1.6fr_1fr]">
              <Link href={`/library/${hero.slug}`} className="relative min-h-44">
                <CapsuleArt art={hero.art} ratio="banner" className="h-full w-full" iconClassName="max-h-20" />
              </Link>
              <div className="flex flex-col justify-center gap-3 border-t border-line p-5 md:border-t-0 md:border-l">
                <span className="text-xs text-mute">{typeMeta[hero.type].label} · {hero.developer}</span>
                <h3 className="text-xl font-bold">{hero.name}</h3>
                <p className="flex items-center gap-1.5 text-sm text-dim">
                  <Clock className="size-3.5" /> 累计 {formatPlaytime(hero.usageMinutes)} · 最近 {hero.lastUsedAt}
                </p>
                <Link href={launchHref(hero)} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep">
                  <Play className="size-4 fill-white" /> {hero.hasEntry ? "启动" : "打开"}
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* 最近使用横排 */}
        {recentStrip.length > 0 && (
          <section>
            <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {recentStrip.map((i) => (
                <Link key={i.slug} href={launchHref(i)} className="capsule group w-40 shrink-0 overflow-hidden">
                  <CapsuleArt art={i.art} ratio="wide" iconClassName="size-1/3" />
                  <div className="p-2">
                    <p className="truncate text-xs font-medium transition-colors group-hover:text-accent">{i.name}</p>
                    <p className="text-[11px] text-mute">{formatPlaytimeShort(i.usageMinutes)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 全部（带排序） */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-lg font-bold">{activeType === "all" ? "全部" : typeMeta[activeType].label}</h2>
            <span className="text-sm text-mute">{filtered.length}</span>
            <div className="ml-auto flex items-center gap-1 text-xs">
              <span className="text-mute">排序</span>
              {sorts.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={cn("rounded px-2 py-1 transition-colors", sort === s.key ? "bg-accent/8 font-medium text-accent" : "text-dim hover:bg-card-hi")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="capsule p-8 text-center text-sm text-dim">没有匹配的产品。</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {filtered.map((i, idx) => (
                <motion.div
                  key={i.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx, 12) * 0.03, ease: "easeOut" }}
                >
                <Link href={launchHref(i)} className="capsule group block overflow-hidden">
                  <div className="relative">
                    <CapsuleArt art={i.art} ratio="tall" iconClassName="size-1/3" />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white">
                        <Play className="size-3.5 fill-white" /> {i.hasEntry ? "启动" : "打开"}
                      </span>
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-accent">{i.name}</p>
                    <p className="mt-0.5 text-[11px] text-mute">{typeMeta[i.type].label} · {formatPlaytimeShort(i.usageMinutes)}</p>
                  </div>
                </Link>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
