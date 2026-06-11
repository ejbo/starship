"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { cn } from "@/lib/cn";
import type { ProductArt } from "@/lib/types";

type Item =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "image"; src: string }
  | { kind: "gradient"; variant: number };

/** 详情页媒体画廊：预告视频 + 真实截图；无媒体时回退到渐变变体。 */
export function MediaGallery({ art, trailerUrl }: { art: ProductArt; trailerUrl?: string }) {
  const items: Item[] = [];
  const poster = art.bannerUrl ?? art.screenshots?.[0] ?? art.capsuleUrl;
  if (trailerUrl) items.push({ kind: "video", src: trailerUrl, poster });
  for (const s of art.screenshots ?? []) items.push({ kind: "image", src: s });
  if (items.length === 0) {
    const fallbackImg = art.bannerUrl ?? art.capsuleUrl;
    if (fallbackImg) items.push({ kind: "image", src: fallbackImg });
    else for (const v of [0, 1, 2, 3]) items.push({ kind: "gradient", variant: v });
  }

  const [active, setActive] = useState(0);
  const cur = items[active] ?? items[0];

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded-lg border border-line bg-ink/5">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={active} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {cur.kind === "video" ? (
              <video src={cur.src} poster={cur.poster} controls playsInline className="aspect-video w-full bg-black object-contain" />
            ) : cur.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cur.src} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <CapsuleArt art={art} ratio="wide" variant={cur.variant} iconClassName="max-h-24" />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {items.length > 1 && (
        <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`画面 ${i + 1}`}
              className={cn(
                "relative w-24 shrink-0 overflow-hidden rounded-md ring-1 transition-all duration-150",
                active === i ? "ring-2 ring-accent" : "ring-line opacity-70 hover:opacity-100",
              )}
            >
              {it.kind === "video" ? (
                <div className="relative">
                  {it.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.poster} alt="" className="aspect-video w-full bg-black object-cover" />
                  ) : (
                    <div className="aspect-video w-full bg-black" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="size-5 fill-white text-white" />
                  </span>
                </div>
              ) : it.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.src} alt="" className="aspect-video w-full object-cover" />
              ) : (
                <CapsuleArt art={art} ratio="wide" variant={it.variant} iconClassName="size-1/3" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
