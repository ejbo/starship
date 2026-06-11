"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AuroraBackground } from "./aurora-background";

export interface PromoBannerItem {
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  videoUrl?: string;
  href: string;
}

/**
 * 顶部全宽活动横幅（仿 Steam BULLET FEST）：满屏出血，背景默认走 Canvas 动态极光
 * （炫酷动态、自包含无外部素材）；管理员设了 videoUrl 则用真实视频覆盖。文案对齐内容容器，
 * 多个则自动轮播。
 */
export function PromoBanner({ banners }: { banners: PromoBannerItem[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 7000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const b = banners[i % banners.length];
  const hasVideo = Boolean(b.videoUrl);

  return (
    <section className="relative">
      <div className="relative block h-[220px] overflow-hidden sm:h-[320px] lg:h-[420px]">
        {/* 动态背景：视频优先，否则 Canvas 极光（常驻，不随文案切换重绘） */}
        {hasVideo ? (
          <video
            key={b.videoUrl}
            src={b.videoUrl}
            poster={b.imageUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <AuroraBackground className="absolute inset-0 size-full" />
        )}

        {/* 压暗渐变，保证文案可读 + 两端暗角 */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b22]/85 via-[#0b1138]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />

        {/* 文案对齐内容容器（max-w-7xl），轮播时仅文案淡入淡出 */}
        <Link href={b.href} className="group absolute inset-0">
          <div className="mx-auto flex h-full max-w-7xl flex-col justify-center gap-3 px-4 text-white sm:px-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex flex-col gap-3"
              >
                {b.badge && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                    <Sparkles className="size-3.5" />
                    {b.badge}
                  </span>
                )}
                <h2 className="font-display text-3xl font-black leading-none tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
                  {b.title}
                </h2>
                {b.subtitle && <p className="max-w-lg text-sm text-white/85 drop-shadow sm:text-base">{b.subtitle}</p>}
                <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg transition-transform group-hover:translate-x-0.5">
                  立即探索
                  <ArrowRight className="size-4" />
                </span>
              </motion.div>
            </AnimatePresence>
          </div>
        </Link>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, j) => (
            <button
              key={j}
              aria-label={`横幅 ${j + 1}`}
              onClick={() => setI(j)}
              className={`h-1.5 rounded-full transition-all ${j === i % banners.length ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
