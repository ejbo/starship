"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export interface PromoBannerItem {
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  videoUrl?: string;
  href: string;
}

/**
 * 顶部全宽活动横幅（仿 Steam BULLET FEST）：满屏出血、支持动图/视频，
 * 文案对齐到内容容器。内容来自管理员后台 /admin/banners，多个则自动轮播。
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

  return (
    <section className="relative">
      <Link href={b.href} className="group relative block h-[200px] overflow-hidden sm:h-[300px] lg:h-[400px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {b.videoUrl ? (
              <video
                src={b.videoUrl}
                poster={b.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.imageUrl} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
            )}
            {/* 横向渐变压暗左侧文案区，并在两端做轻微暗角 */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f1733]/90 via-[#1d2bbd]/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          </motion.div>
        </AnimatePresence>

        {/* 文案对齐内容容器（max-w-7xl），与下方区块同一左边线 */}
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-7xl flex-col justify-center gap-3 px-4 text-white sm:px-6">
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
          </div>
        </div>
      </Link>

      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
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
