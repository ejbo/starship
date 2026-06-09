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

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % products.length);
  }, [products.length]);

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

      <div className="capsule grid overflow-hidden md:grid-cols-[1.7fr_1fr]">
        {/* 大画面 */}
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

        {/* 信息面板 */}
        <div className="flex flex-col gap-3 border-t border-line p-5 md:border-t-0 md:border-l">
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
              <h3 className="text-2xl font-bold leading-tight">{current.name}</h3>
              <p className="text-sm leading-relaxed text-dim">{current.tagline}</p>
              <div className="flex flex-wrap gap-1.5">
                {current.tags.map((tag) => (
                  <span key={tag} className="rounded bg-card-hi px-2 py-0.5 text-xs text-dim">
                    {tag}
                  </span>
                ))}
              </div>
              <Rating score={current.rating.score} count={current.rating.count} className="mt-auto" />
              <div className="flex items-center gap-3">
                <Link
                  href={`/p/${current.slug}`}
                  className="group/cta inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
                >
                  查看详情
                  <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
                <PriceTag price={current.price} className="text-sm" />
                <span className="ml-auto flex items-center gap-1 text-xs text-mute">
                  <Download className="size-3.5" />
                  {current.acquisitions.toLocaleString("zh-CN")}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 指示点 */}
          <div className="flex gap-1.5 pt-2">
            {products.map((p, i) => (
              <button
                key={p.id}
                aria-label={`切换到 ${p.name}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-accent" : "w-3 bg-line hover:bg-mute",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
