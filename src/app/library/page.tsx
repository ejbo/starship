import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { TypeBadge, typeMeta } from "@/components/ui/type-badge";
import { getLibrary, type LibraryItem } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

function RecentCard({ item, delay }: { item: LibraryItem; delay: number }) {
  return (
    <Link
      href={`/p/${item.product.slug}`}
      className="capsule group relative block overflow-hidden animate-[fade-up_.5s_ease_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CapsuleArt art={item.product.art} ratio="wide" />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4">
        <h3 className="font-bold">{item.product.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-dim">
          <Clock className="size-3" /> 累计 {item.usageHours} 小时 · 最近 {item.lastUsedAt}
        </p>
      </div>
      <span className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-aurora px-2.5 py-1 text-xs font-semibold text-abyss opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Play className="size-3 fill-abyss" /> 启动
      </span>
    </Link>
  );
}

function ShelfCard({ item, delay }: { item: LibraryItem; delay: number }) {
  return (
    <Link
      href={`/p/${item.product.slug}`}
      className="capsule group relative block overflow-hidden animate-[fade-up_.5s_ease_both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CapsuleArt art={item.product.art} ratio="tall" iconClassName="size-1/3" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
        <p className="truncate text-sm font-semibold">{item.product.name}</p>
        <p className="text-[11px] text-dim">{item.usageHours} 小时</p>
      </div>
      <span className="absolute inset-0 flex items-center justify-center bg-abyss/40 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
        <span className="flex items-center gap-1.5 rounded-md bg-aurora px-3 py-1.5 text-sm font-semibold text-abyss">
          <Play className="size-3.5 fill-abyss" /> 启动
        </span>
      </span>
    </Link>
  );
}

export default function LibraryPage() {
  const library = getLibrary();
  const recent = library.slice(0, 3);

  const typeCounts = library.reduce<Map<ProductType, number>>((acc, item) => {
    acc.set(item.product.type, (acc.get(item.product.type) ?? 0) + 1);
    return acc;
  }, new Map());

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3 animate-[fade-up_.5s_ease_both]">
        <h1 className="text-2xl font-bold">港湾</h1>
        <span className="font-display text-[10px] font-semibold tracking-[0.3em] text-mute">MY HARBOR</span>
        <span className="text-sm text-dim">{library.length} 个停泊中的造物</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* 侧栏过滤 */}
        <aside className="space-y-1 self-start text-sm animate-[fade-up_.5s_ease_both] lg:sticky lg:top-20" style={{ animationDelay: "60ms" }}>
          <p className="flex items-center justify-between rounded-md bg-card-hi px-3 py-2 font-medium text-ink">
            全部 <span className="font-display text-xs text-aurora">{library.length}</span>
          </p>
          {[...typeCounts.entries()].map(([type, count]) => (
            <p key={type} className="flex items-center justify-between rounded-md px-3 py-2 text-dim transition-colors hover:bg-card hover:text-ink">
              {typeMeta[type].label}
              <span className="font-display text-xs text-mute">{count}</span>
            </p>
          ))}
        </aside>

        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="mb-3 text-lg font-bold animate-[fade-up_.5s_ease_both]">最近使用</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((item, i) => (
                <RecentCard key={item.product.id} item={item} delay={80 + i * 60} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold animate-[fade-up_.5s_ease_both]" style={{ animationDelay: "200ms" }}>
              全部藏品
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {library.map((item, i) => (
                <ShelfCard key={item.product.id} item={item} delay={240 + i * 40} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
