"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Code2, TrendingUp } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { ratingVerdict } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

const INTERVAL = 6000;

export function HeroCarousel({ products, ranks }: { products: Product[]; ranks?: Record<string, number> }) {
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const current = products[index];

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + products.length) % products.length),
    [products.length],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => (i + 1) % products.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [products.length]);

  if (!current) return null;
  const verdict = ratingVerdict(current.rating.score);
  const rank = ranks?.[current.slug];

  return (
    <section
      id="featured"
      className="scroll-mt-28"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">精选与推荐</h2>
        <Link
          href="/developer"
          className="inline-flex items-center gap-1.5 rounded-md bg-card-hi px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:text-accent"
        >
          <Code2 className="size-3.5" />
          成为开发者
        </Link>
      </div>

      <div className="relative">
        {/* 左右箭头 */}
        <button
          aria-label="上一个"
          onClick={() => go(-1)}
          className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-line bg-panel/90 p-2 text-dim shadow-sm backdrop-blur transition-colors hover:text-accent lg:block"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          aria-label="下一个"
          onClick={() => go(1)}
          className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-line bg-panel/90 p-2 text-dim shadow-sm backdrop-blur transition-colors hover:text-accent lg:block"
        >
          <ChevronRight className="size-5" />
        </button>

        {/* 大卡：左大图 + 右深色信息面板 */}
        <div className="grid overflow-hidden rounded-xl shadow-sm md:grid-cols-[1.7fr_1fr]">
          <Link href={`/p/${current.slug}`} className="relative block min-h-64 overflow-hidden bg-ink/5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={current.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <CapsuleArt art={current.art} ratio="banner" className="size-full" iconClassName="max-h-24" />
              </motion.div>
            </AnimatePresence>
          </Link>

          {/* 深色聚光信息面板（Steam 风） */}
          <div className="flex flex-col gap-3 bg-[#16202d] p-5 text-white">
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
                  <span className="text-xs text-slate-400">{current.developer}</span>
                </div>
                <Link href={`/p/${current.slug}`} className="text-xl font-bold leading-tight hover:text-sky-300">
                  {current.name}
                </Link>

                {/* 评价档位 + 条数 */}
                <p className="text-sm">
                  <span
                    className={cn(
                      "font-medium",
                      verdict.tone === "bad" ? "text-rose-400" : verdict.tone === "mixed" ? "text-amber-300" : "text-sky-300",
                    )}
                  >
                    {verdict.label}
                  </span>
                  <span className="text-slate-400"> （{current.rating.count.toLocaleString("zh-CN")} 篇评测）</span>
                </p>

                {/* 2×2 截图格 */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[1, 2, 3, 4].map((v) => (
                    <CapsuleArt
                      key={v}
                      art={current.art}
                      ratio="wide"
                      variant={v}
                      className="rounded ring-1 ring-white/10"
                      iconClassName="size-1/4"
                    />
                  ))}
                </div>

                {/* 热销排名徽标 */}
                {rank != null && rank <= 10 && (
                  <p className="mt-auto flex items-center gap-2 text-sm">
                    <TrendingUp className="size-5 text-lime-400" />
                    <span className="font-semibold text-lime-400">热销</span>
                    <span className="text-slate-300">本周排名第 {rank} 名</span>
                  </p>
                )}

                {/* 价格 + CTA */}
                <div className={cn("flex items-center justify-between gap-3", rank == null || rank > 10 ? "mt-auto" : "")}>
                  <span className="text-sm font-medium">
                    {current.price === "free" ? (
                      <span className="text-lime-400">免费开玩</span>
                    ) : (
                      <span className="text-slate-200">{current.price.credits} 点数</span>
                    )}
                  </span>
                  <Link
                    href={`/p/${current.slug}`}
                    className="group/cta inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                  >
                    查看详情
                    <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* 圆点指示 */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {products.map((p, i) => (
            <button
              key={p.id}
              aria-label={`第 ${i + 1} 个`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-mute",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
