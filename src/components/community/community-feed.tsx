"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Heart, MessageCircle, Plus, Share2, Star, Users, Wrench } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { TypeBadge } from "@/components/ui/type-badge";
import { cn } from "@/lib/cn";
import type { ActivityEvent, Product } from "@/lib/types";

const verbMeta: Record<ActivityEvent["verb"], { text: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  acquired: { text: "获取了", icon: Plus, tone: "text-accent" },
  reviewed: { text: "评测了", icon: Star, tone: "text-gold" },
  published: { text: "更新了", icon: Wrench, tone: "text-green" },
  roundtable: { text: "", icon: Users, tone: "text-purple" },
  "installed-skill": { text: "", icon: Star, tone: "text-gold" },
};

/** 由 event/product 派生稳定且可信的初始互动数 */
function seedCount(seed: string, base: number, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return base + (h % mod);
}

function FeedCard({ event, product, index }: { event: ActivityEvent; product?: Product; index: number }) {
  const meta = verbMeta[event.verb];
  const Icon = meta.icon;
  const [liked, setLiked] = useState(false);
  const baseLikes = seedCount(event.id, 6, 88);
  const comments = seedCount(event.id + "c", 0, 18);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05, ease: "easeOut" }}
      className="capsule overflow-hidden transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={event.actor.name} hue={event.actor.avatarHue} size="md" isAgent={event.actor.isAgent} />
        <div className="min-w-0 grow">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{event.actor.name}</span>{" "}
            {event.detail ? (
              <span className="text-dim">{event.detail}</span>
            ) : (
              <>
                <span className="text-dim">{meta.text}</span>{" "}
                {product && (
                  <Link href={`/p/${product.slug}`} className="font-medium text-accent hover:underline">
                    {product.name}
                  </Link>
                )}
              </>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
            <Icon className={`size-3 ${meta.tone}`} /> {event.at}
          </p>
        </div>
      </div>

      {product && (
        <Link href={`/p/${product.slug}`} className="group relative block border-t border-line">
          <CapsuleArt art={product.art} ratio="banner" iconClassName="max-h-16" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
            <span className="text-sm font-semibold text-white">{product.name}</span>
            <TypeBadge type={product.type} className="bg-white/85" />
            <span className="ml-auto flex items-center gap-1 text-xs text-white/80">
              <Download className="size-3" /> {product.acquisitions.toLocaleString("zh-CN")}
            </span>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-1 border-t border-line px-2.5 py-1.5 text-xs">
        <button
          onClick={() => setLiked((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium transition-colors",
            liked ? "text-rose-500" : "text-mute hover:text-ink",
          )}
        >
          <Heart className={cn("size-4 transition-transform", liked && "scale-110 fill-current")} />
          {baseLikes + (liked ? 1 : 0)}
        </button>
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-mute transition-colors hover:text-ink">
          <MessageCircle className="size-4" />
          {comments}
        </button>
        <button className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-mute transition-colors hover:text-accent">
          <Share2 className="size-4" />
          分享
        </button>
      </div>
    </motion.article>
  );
}

export function CommunityFeed({ items }: { items: { event: ActivityEvent; product?: Product }[] }) {
  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <FeedCard key={it.event.id} event={it.event} product={it.product} index={i} />
      ))}
    </div>
  );
}
