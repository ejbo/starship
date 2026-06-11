"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { label: string; href: string };
const menus: { label: string; items: Item[] }[] = [
  {
    label: "浏览",
    items: [
      { label: "商店首页", href: "/" },
      { label: "全部应用", href: "/t/app" },
      { label: "排行榜", href: "/#charts" },
      { label: "新品", href: "/#charts" },
    ],
  },
  {
    label: "推荐",
    items: [
      { label: "为你推荐", href: "/#discovery" },
      { label: "精选与推荐", href: "/#featured" },
      { label: "高分作品", href: "/#charts" },
    ],
  },
  {
    label: "分类",
    items: [
      { label: "应用", href: "/t/app" },
      { label: "AI 模型", href: "/t/model" },
      { label: "Agent", href: "/t/agent" },
      { label: "Skill 工坊", href: "/t/skill" },
      { label: "互动教程", href: "/t/tutorial" },
      { label: "视频", href: "/t/video" },
    ],
  },
  {
    label: "更多",
    items: [
      { label: "开发者中心", href: "/developer" },
      { label: "平台接口", href: "/developer/integrate" },
      { label: "社区", href: "/community" },
    ],
  },
];

/**
 * 商店子导航条（客户端）：玻璃悬浮，向下滚动时隐藏、向上或回到顶部时显现（仿苹果/Steam）。
 */
export function SubnavBar({ wishCount }: { wishCount: number }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        // 接近顶部始终显示；向下滚动且越过阈值则隐藏；向上滚动则显示
        if (y < 80) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-[68px] z-40 px-3 pt-2 transition-all duration-300 ease-out",
        hidden && "pointer-events-none -translate-y-3 opacity-0",
      )}
    >
      <div className="mx-auto flex h-11 max-w-7xl items-center gap-1 rounded-xl border border-line/60 bg-panel/70 px-3 shadow-[0_8px_26px_-16px_rgba(20,30,60,0.3)] backdrop-blur-xl supports-[backdrop-filter]:bg-panel/70 sm:px-4">
        <div className="hidden items-center gap-1 md:flex">
          {menus.map((m) => (
            <div key={m.label} className="group relative">
              <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink">
                {m.label}
                <ChevronDown className="size-3.5 opacity-60 transition-transform group-hover:rotate-180" />
              </button>
              <div className="absolute left-0 top-full hidden min-w-44 pt-1 group-hover:block">
                <div className="capsule overflow-hidden py-1 shadow-lg">
                  {m.items.map((it) => (
                    <Link
                      key={it.label + it.href}
                      href={it.href}
                      className="block px-3.5 py-2 text-sm text-dim transition-colors hover:bg-accent/8 hover:text-accent"
                    >
                      {it.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/wishlist"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink"
          >
            <Heart className="size-4 text-rose-500" />
            <span className="hidden sm:inline">心愿单</span>
            {wishCount > 0 && <span className="text-xs text-mute">{wishCount}</span>}
          </Link>
          <Link
            href="/#charts"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink sm:flex"
          >
            <Trophy className="size-4 text-star" />
            排行榜
          </Link>
        </div>
      </div>
    </div>
  );
}
