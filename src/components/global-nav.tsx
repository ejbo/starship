"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Anchor, Search, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/", label: "商店" },
  { href: "/library", label: "港湾" },
  { href: "/community", label: "社区" },
] as const;

interface GlobalNavProps {
  userName: string;
  userHue: number;
  tokenBalance: string;
}

export function GlobalNav({ userName, userHue, tokenBalance }: GlobalNavProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/p/") : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "glass shadow-[0_8px_32px_-12px_rgb(0_0_0/.8)]" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora/25 to-nebula/25 ring-1 ring-aurora/40">
            <Anchor className="size-4 text-aurora" strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-aurora shadow-[0_0_8px_2px_rgb(83_216_255/.7)] animate-[pulse-dot_2.4s_ease-in-out_infinite]" />
          </span>
          <span className="leading-none">
            <span className="block text-[15px] font-bold tracking-wide">星港</span>
            <span className="block font-display text-[9px] font-semibold tracking-[0.3em] text-aurora/80 group-hover:text-aurora transition-colors">
              STARPORT
            </span>
          </span>
        </Link>

        {/* 主导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(link.href) ? "text-ink" : "text-dim hover:text-ink",
              )}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute inset-x-3 -bottom-px h-px bg-gradient-to-r from-transparent via-aurora to-transparent" />
              )}
            </Link>
          ))}
          <span
            className="cursor-not-allowed rounded-md px-3.5 py-2 text-sm font-medium text-mute"
            title="港务局（开发者后台）· Phase 6 开放"
          >
            港务局
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* 搜索 */}
          <label className="hidden items-center gap-2 rounded-md border border-line bg-panel/80 px-3 py-1.5 text-sm text-mute transition-colors focus-within:border-aurora/50 lg:flex">
            <Search className="size-3.5" />
            <input
              placeholder="搜索造物 / 开发者 / 标签"
              className="w-44 bg-transparent text-ink placeholder:text-mute focus:outline-none"
            />
          </label>

          {/* 用量额度 */}
          <span className="hidden items-center gap-1.5 rounded-full border border-teal/30 bg-teal/10 px-3 py-1.5 font-display text-xs font-semibold text-teal sm:flex">
            <Zap className="size-3.5 fill-teal" />
            {tokenBalance}
          </span>

          <Link href="/u/me" className="transition-transform hover:scale-105">
            <Avatar name={userName} hue={userHue} size="md" />
          </Link>
        </div>
      </div>
      {/* 停泊线 */}
      <div className="h-px bg-gradient-to-r from-transparent via-line to-transparent" />
    </header>
  );
}
