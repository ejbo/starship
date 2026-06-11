"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Code2, TrendingUp } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { ratingVerdict } from "@/components/ui/rating";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

const INTERVAL = 6000;

/** 单张精选大卡（左大图 + 右深色信息面板，Steam 风）。 */
function FeaturedCard({ product, rank, active }: { product: Product; rank?: number; active: boolean }) {
  const verdict = ratingVerdict(product.rating.score);
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-xl shadow-sm transition-all duration-500 md:grid-cols-[1.7fr_1fr]",
        active ? "opacity-100" : "opacity-55 scale-[0.97]",
      )}
    >
      <Link href={`/p/${product.slug}`} className="relative block min-h-64 overflow-hidden bg-ink/5">
        <CapsuleArt art={product.art} ratio="banner" className="size-full" iconClassName="max-h-24" />
      </Link>

      <div className="flex flex-col gap-3 bg-[#16202d] p-5 text-white">
        <div className="flex items-center gap-2">
          <TypeBadge type={product.type} />
          <span className="text-xs text-slate-400">{product.developer}</span>
        </div>
        <Link href={`/p/${product.slug}`} className="text-xl font-bold leading-tight hover:text-sky-300">
          {product.name}
        </Link>

        <p className="text-sm">
          <span
            className={cn(
              "font-medium",
              verdict.tone === "bad" ? "text-rose-400" : verdict.tone === "mixed" ? "text-amber-300" : "text-sky-300",
            )}
          >
            {verdict.label}
          </span>
          <span className="text-slate-400"> （{product.rating.count.toLocaleString("zh-CN")} 篇评测）</span>
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {[1, 2, 3, 4].map((v) => (
            <CapsuleArt
              key={v}
              art={product.art}
              ratio="wide"
              variant={v}
              className="rounded ring-1 ring-white/10"
              iconClassName="size-1/4"
            />
          ))}
        </div>

        {rank != null && rank <= 10 && (
          <p className="mt-auto flex items-center gap-2 text-sm">
            <TrendingUp className="size-5 text-lime-400" />
            <span className="font-semibold text-lime-400">热销</span>
            <span className="text-slate-300">本周排名第 {rank} 名</span>
          </p>
        )}

        <div className={cn("flex items-center justify-between gap-3", rank == null || rank > 10 ? "mt-auto" : "")}>
          <span className="text-sm font-medium">
            {product.price === "free" ? (
              <span className="text-lime-400">免费开玩</span>
            ) : (
              <span className="text-slate-200">{product.price.credits} 点数</span>
            )}
          </span>
          <Link
            href={`/p/${product.slug}`}
            className="group/cta inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            查看详情
            <ArrowRight className="size-4 transition-transform group-hover/cta:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HeroCarousel({ products, ranks }: { products: Product[]; ranks?: Record<string, number> }) {
  const n = products.length;
  const loop = n > 1;
  // 三份拷贝实现无缝循环：起始停在中间那份，两侧永远有牌可半隐
  const display = loop ? [...products, ...products, ...products] : products;

  const [index, setIndex] = useState(loop ? n : 0); // display 下标
  const [anim, setAnim] = useState(true);
  const [offset, setOffset] = useState(0);
  const pausedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const go = useCallback((dir: number) => {
    setAnim(true);
    setIndex((i) => i + dir);
  }, []);

  const jumpTo = useCallback((logical: number) => {
    setAnim(true);
    setIndex(loop ? n + logical : logical);
  }, [loop, n]);

  // 居中当前卡：offset = 视口中线 − 卡片中线（卡窄于视口 → 两侧露出相邻卡）
  const recenter = useCallback(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;
    setOffset(vp.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2));
  }, [index]);

  useLayoutEffect(() => {
    recenter();
  }, [recenter]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => recenter());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [recenter]);

  // 进入克隆区后，等动画结束无动画地拉回中间那份，达成无缝循环
  useEffect(() => {
    if (!loop) return;
    if (index >= 2 * n || index < n) {
      const t = setTimeout(() => {
        setAnim(false);
        setIndex((i) => (((i % n) + n) % n) + n);
      }, 520);
      return () => clearTimeout(t);
    }
  }, [index, loop, n]);

  // 无动画跳转后下一帧恢复动画
  useEffect(() => {
    if (anim) return;
    const r = requestAnimationFrame(() => setAnim(true));
    return () => cancelAnimationFrame(r);
  }, [anim]);

  // 自动轮播
  useEffect(() => {
    if (!loop) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setAnim(true);
        setIndex((i) => i + 1);
      }
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [loop]);

  if (n === 0) return null;
  const logical = (((index % n) + n) % n);

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
        {loop && (
          <>
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
          </>
        )}

        {/* 半隐无缝轮播视口 */}
        <div ref={viewportRef} className="overflow-hidden">
          <div
            ref={trackRef}
            className={cn("flex gap-4 ease-out", anim ? "transition-transform duration-500" : "transition-none")}
            style={{ transform: `translateX(${offset}px)` }}
          >
            {display.map((p, i) => (
              <div key={`${p.id}-${i}`} className="relative w-[92%] shrink-0 sm:w-[88%] lg:w-[82%]">
                <FeaturedCard product={p} rank={ranks?.[p.slug]} active={i === index} />
                {i !== index && (
                  <button
                    onClick={() => { setAnim(true); setIndex(i); }}
                    aria-label={`查看 ${p.name}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-xl"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 圆点指示 */}
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {products.map((p, i) => (
            <button
              key={p.id}
              aria-label={`第 ${i + 1} 个`}
              onClick={() => jumpTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === logical ? "w-6 bg-accent" : "w-1.5 bg-line hover:bg-mute",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
