"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { PriceTag } from "@/components/store/product-card";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { Rating } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

const INTERVAL = 6000;

export function HeroCarousel({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const current = products[index];

  const advance = useCallback(() => setIndex((i) => (i + 1) % products.length), [products.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) advance();
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [advance]);

  if (!current) return null;

  return (
    <section
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <h2 className="mb-3 text-lg font-bold">精选与推荐</h2>

      <div className="grid gap-3 lg:grid-cols-[1fr_232px]">
        {/* 主卡 */}
        <div className="capsule grid overflow-hidden sm:grid-cols-[1.5fr_1fr]">
          <div className="relative min-h-56 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <CapsuleArt art={current.art} ratio="banner" className="h-full w-full" iconClassName="max-h-24" />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex flex-col gap-3 border-t border-line p-5 sm:border-t-0 sm:border-l">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex grow flex-col gap-3"
              >
                <div className="flex items-center gap-2">
                  <TypeBadge type={current.type} />
                  <span className="text-xs text-mute">{current.developer}</span>
                </div>
                <h3 className="text-xl font-bold leading-tight">{current.name}</h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-dim">{current.tagline}</p>
                {/* 截图缩略 */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((v) => (
                    <CapsuleArt key={v} art={current.art} ratio="wide" variant={v + 1} className="w-1/3 rounded ring-1 ring-line" iconClassName="size-1/4" />
                  ))}
                </div>
                <Rating score={current.rating.score} count={current.rating.count} className="mt-auto text-xs" />
                <div className="flex items-center gap-3">
                  <Link
                    href={`/p/${current.slug}`}
                    className="group/cta inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                  >
                    查看详情
                    <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                  <PriceTag price={current.price} className="text-sm" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 右侧缩略图竖列（Steam 标志） */}
        <div className="hidden flex-col gap-1.5 lg:flex">
          {products.map((p, i) => (
            <button
              key={p.id}
              onMouseEnter={() => setIndex(i)}
              onClick={() => setIndex(i)}
              className={cn(
                "flex items-center gap-2 rounded-md border p-1.5 text-left transition-colors",
                i === index ? "border-accent bg-accent/5" : "border-transparent hover:bg-card-hi",
              )}
            >
              <CapsuleArt art={p.art} ratio="wide" className="w-16 shrink-0 rounded ring-1 ring-line" iconClassName="size-1/3" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{p.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-mute">
                  <Download className="size-2.5" /> {p.acquisitions.toLocaleString("zh-CN")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
