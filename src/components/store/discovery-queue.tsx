import Link from "next/link";
import { Compass, ChevronRight } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import type { Product } from "@/lib/types";

/** 发现队列横幅：Steam Discovery Queue 的星港版 */
export function DiscoveryQueue({ products }: { products: Product[] }) {
  const first = products[0];
  const preview = products.slice(0, 4);
  if (!first) return null;

  return (
    <section className="animate-[fade-up_.6s_ease_both]" style={{ animationDelay: "120ms" }}>
      <Link
        href={`/p/${first.slug}`}
        className="capsule group relative flex items-center gap-5 overflow-hidden p-5"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(105deg, rgb(83 216 255 / .10), transparent 40%, rgb(157 123 255 / .12) 80%)",
          }}
        />
        <span className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aurora/20 to-nebula/25 ring-1 ring-aurora/35">
          <Compass className="size-6 text-aurora transition-transform duration-500 group-hover:rotate-45" />
        </span>
        <div className="relative min-w-0">
          <h3 className="font-bold">今日发现队列</h3>
          <p className="truncate text-sm text-dim">
            为你挑选了 {products.length} 个造物 —— 从《{first.name}》开始探索
          </p>
        </div>
        <div className="relative ml-auto hidden items-center sm:flex">
          {preview.map((p, i) => (
            <CapsuleArt
              key={p.id}
              art={p.art}
              ratio="square"
              className="-ml-3 w-14 rounded-lg ring-2 ring-abyss transition-transform duration-200 first:ml-0 group-hover:translate-x-[calc(var(--i)*2px)]"
              iconClassName="size-1/2"
              variant={i}
            />
          ))}
          <ChevronRight className="ml-3 size-5 text-dim transition-transform group-hover:translate-x-1 group-hover:text-aurora" />
        </div>
      </Link>
    </section>
  );
}
