"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/", label: "商店" },
  { href: "/library", label: "库" },
  { href: "/community", label: "社区" },
] as const;

interface GlobalNavProps {
  userName: string;
  userHue: number;
  tokenBalance: string;
}

export function GlobalNav({ userName, userHue, tokenBalance }: GlobalNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/p/") || pathname.startsWith("/run/")
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-panel">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
            港
          </span>
          <span className="text-[15px] font-bold">星港</span>
        </Link>

        {/* 主导航 */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(link.href) ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
          <span
            className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium text-mute"
            title="开发者中心 · Phase 6 开放"
          >
            开发者中心
          </span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* 搜索 */}
          <label className="hidden items-center gap-2 rounded-md border border-line bg-page px-3 py-1.5 text-sm text-mute transition-colors focus-within:border-accent lg:flex">
            <Search className="size-3.5" />
            <input
              placeholder="搜索应用、模型、开发者"
              className="w-44 bg-transparent text-ink placeholder:text-mute focus:outline-none"
            />
          </label>

          {/* 用量额度 */}
          <span className="hidden items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim sm:flex" title="本月可用模型额度">
            <Zap className="size-3.5 text-warn" />
            {tokenBalance} tokens
          </span>

          <Link href="/u/me" className="transition-opacity hover:opacity-80">
            <Avatar name={userName} hue={userHue} size="md" />
          </Link>
        </div>
      </div>
    </header>
  );
}
