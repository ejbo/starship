import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { typeMeta } from "@/components/ui/type-badge";
import { getLibrary, type LibraryItem } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

/** 应用跳沙箱启动页，其余类型回详情页 */
function launchHref(item: LibraryItem) {
  return item.product.entry ? `/run/${item.product.slug}` : `/p/${item.product.slug}`;
}

function RecentCard({ item }: { item: LibraryItem }) {
  return (
    <div className="capsule group overflow-hidden">
      <Link href={`/p/${item.product.slug}`} className="block">
        <CapsuleArt art={item.product.art} ratio="wide" />
      </Link>
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 grow">
          <h3 className="truncate text-sm font-semibold">{item.product.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
            <Clock className="size-3" /> 累计 {item.usageHours} 小时 · 最近 {item.lastUsedAt}
          </p>
        </div>
        <Link
          href={launchHref(item)}
          className="flex shrink-0 items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
        >
          <Play className="size-3 fill-white" /> {item.product.entry ? "启动" : "打开"}
        </Link>
      </div>
    </div>
  );
}

function ShelfCard({ item }: { item: LibraryItem }) {
  return (
    <Link href={launchHref(item)} className="capsule group block overflow-hidden">
      <CapsuleArt art={item.product.art} ratio="tall" iconClassName="size-1/3" />
      <div className="p-2.5">
        <p className="truncate text-sm font-medium transition-colors group-hover:text-accent">
          {item.product.name}
        </p>
        <p className="mt-0.5 text-[11px] text-mute">
          {typeMeta[item.product.type].label} · {item.usageHours} 小时
        </p>
      </div>
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
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">库</h1>
        <span className="text-sm text-dim">{library.length} 个产品</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[190px_1fr]">
        {/* 侧栏过滤 */}
        <aside className="space-y-1 self-start text-sm lg:sticky lg:top-18">
          <p className="flex items-center justify-between rounded-md bg-accent/8 px-3 py-2 font-medium text-accent">
            全部 <span className="text-xs">{library.length}</span>
          </p>
          {[...typeCounts.entries()].map(([type, count]) => (
            <p
              key={type}
              className="flex items-center justify-between rounded-md px-3 py-2 text-dim transition-colors hover:bg-card-hi hover:text-ink"
            >
              {typeMeta[type].label}
              <span className="text-xs text-mute">{count}</span>
            </p>
          ))}
        </aside>

        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="mb-3 text-lg font-bold">最近使用</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recent.map((item) => (
                <RecentCard key={item.product.id} item={item} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">全部</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {library.map((item) => (
                <ShelfCard key={item.product.id} item={item} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
