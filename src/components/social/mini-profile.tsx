"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { cn } from "@/lib/cn";
import type { Friend } from "@/lib/types";
import { display, isVideoBanner, levelRingColor, presenceMeta, statusText } from "./presence";

const EVENT = "starport:mini-profile";
const CARD_W = 300;
const CARD_H = 196; // 估算高度，用于贴边收纳

interface ShowDetail {
  friend: Friend;
  rect: { top: number; left: number; right: number; bottom: number };
}

/** 绑定到好友行上：悬停显示迷你资料卡（Steam mini-profile） */
export function miniProfileProps(friend: Friend) {
  return {
    onMouseEnter: (e: React.MouseEvent) => {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const detail: ShowDetail = { friend, rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom } };
      window.dispatchEvent(new CustomEvent(EVENT, { detail }));
    },
    onMouseLeave: () => window.dispatchEvent(new CustomEvent(EVENT, { detail: null })),
  };
}

function Banner({ url, hue }: { url: string | null | undefined; hue: number }) {
  if (url && isVideoBanner(url)) {
    return <video src={url} autoPlay loop muted playsInline className="absolute inset-0 size-full object-cover" />;
  }
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="absolute inset-0 size-full object-cover" />;
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(130deg, hsl(${hue} 55% 78%), hsl(${(hue + 50) % 360} 50% 62%))` }}
    />
  );
}

/** 卡片本体（悬停层和将来个人主页都可复用） */
export function MiniProfileCard({ friend }: { friend: Friend }) {
  const meta = presenceMeta[friend.presence.kind];
  const BadgeIcon = friend.badge ? getProductIcon(friend.badge.icon) : null;
  return (
    <div className="w-[300px] overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(28_36_51/.35)]">
      {/* banner（用户自设，可为 GIF/视频动态背景） */}
      <div className="relative h-20">
        <Banner url={friend.bannerUrl} hue={friend.avatarHue} />
        <div className="absolute inset-0 bg-gradient-to-t from-panel/85 via-transparent to-transparent" />
      </div>
      <div className="relative -mt-9 px-3.5 pb-3">
        <div className="flex items-end gap-3">
          <span className="relative shrink-0">
            <Avatar name={display(friend)} hue={friend.avatarHue} src={friend.avatarUrl} size="lg" className="rounded-full ring-4 ring-panel" />
            <span className={cn("absolute -right-0.5 bottom-0.5 size-3 rounded-full ring-2 ring-panel", meta.dot)} />
          </span>
          <div className="min-w-0 grow pb-0.5">
            <p className="truncate text-[15px] font-bold leading-tight">
              {friend.name}
              {friend.remark && <span className="ml-1 text-xs font-normal text-dim">（{friend.remark}）</span>}
            </p>
            <p className={cn("truncate text-xs", meta.tone)}>{statusText(friend)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2.5 border-t border-line pt-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold"
            style={{ borderColor: levelRingColor(friend.level), color: levelRingColor(friend.level) }}
            title={`等级 ${friend.level}`}
          >
            {friend.level}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-medium text-ink">等级 {friend.level}</p>
            <p className="truncate text-[11px] text-mute">@{friend.handle}</p>
          </div>
          {friend.isAgent ? (
            <span className="ml-auto flex items-center gap-1.5 rounded-md border border-line bg-card-hi px-2 py-1 text-[11px] text-dim">
              <Bot className="size-3.5 text-green" />
              {friend.agentKind === "hosted" ? "托管 Agent" : "本地 Agent"}
            </span>
          ) : (
            friend.badge &&
            BadgeIcon && (
              <span className="ml-auto flex items-center gap-1.5 rounded-md border border-line bg-card-hi px-2 py-1 text-[11px] text-dim" title={friend.badge.label}>
                <BadgeIcon className="size-3.5 text-accent" />
                {friend.badge.label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** 全局唯一的悬停层：监听 miniProfileProps 派发的事件，定位在好友行旁边 */
export function MiniProfileLayer() {
  const [shown, setShown] = useState<{ friend: Friend; x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<ShowDetail | null>).detail;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!detail) {
        setShown(null);
        return;
      }
      const { friend, rect } = detail;
      timerRef.current = setTimeout(() => {
        // 优先放行的左侧（社交坞贴右边缘），放不下再换右侧
        let x = rect.left - CARD_W - 12;
        if (x < 8) x = Math.min(rect.right + 12, window.innerWidth - CARD_W - 8);
        const y = Math.max(8, Math.min(rect.top - 24, window.innerHeight - CARD_H - 8));
        setShown({ friend, x, y });
      }, 350);
    };
    window.addEventListener(EVENT, onEvent);
    return () => {
      window.removeEventListener(EVENT, onEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key={shown.friend.handle}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="pointer-events-none fixed z-[65]"
          style={{ left: shown.x, top: shown.y }}
        >
          <MiniProfileCard friend={shown.friend} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
