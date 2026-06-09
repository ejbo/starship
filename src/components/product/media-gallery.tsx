"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { cn } from "@/lib/cn";
import type { ProductArt } from "@/lib/types";

const VARIANTS = [0, 1, 2, 3];

/** 媒体画廊：同一产品的 4 个封面变体模拟截图，点击切换 */
export function MediaGallery({ art }: { art: ProductArt }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded-lg border border-line">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CapsuleArt art={art} ratio="wide" variant={active} iconClassName="max-h-24" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex gap-2.5">
        {VARIANTS.map((v) => (
          <button
            key={v}
            onClick={() => setActive(v)}
            aria-label={`画面 ${v + 1}`}
            className={cn(
              "w-24 overflow-hidden rounded-md ring-1 transition-all duration-150",
              active === v ? "ring-2 ring-accent" : "ring-line opacity-70 hover:opacity-100",
            )}
          >
            <CapsuleArt art={art} ratio="wide" variant={v} iconClassName="size-1/3" />
          </button>
        ))}
      </div>
    </div>
  );
}
