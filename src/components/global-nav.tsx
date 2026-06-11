"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Plus, Search, Settings, Shield, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/", label: "商店" },
  { href: "/library", label: "库" },
  { href: "/community", label: "社区" },
] as const;

interface GlobalNavProps {
  user: { name: string; avatarHue: number; avatarUrl: string | null; tokenBalance: string; credits: number; isAdmin?: boolean } | null;
}

export function GlobalNav({ user }: GlobalNavProps) {
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
          {user && (
            <Link
              href="/developer"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith("/developer") ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
              )}
            >
              开发者中心
            </Link>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin") ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
              )}
            >
              <Shield className="size-3.5" />
              管理后台
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* 搜索 */}
          <form action="/search" className="hidden lg:block">
            <label className="flex items-center gap-2 rounded-md border border-line bg-page px-3 py-1.5 text-sm text-mute transition-colors focus-within:border-accent">
              <Search className="size-3.5" />
              <input
                name="q"
                placeholder="搜索应用、模型、开发者"
                className="w-44 bg-transparent text-ink placeholder:text-mute focus:outline-none"
              />
            </label>
          </form>

          {user ? (
            <>
              {/* 点数余额 → 钱包/充值 */}
              <Link
                href="/wallet"
                className={cn(
                  "hidden items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex",
                  pathname.startsWith("/wallet") ? "border-accent/50 text-accent" : "border-line text-dim hover:border-accent/50 hover:text-accent",
                )}
                title="钱包 · 充值"
              >
                <Coins className="size-3.5 text-gold" />
                {user.credits.toLocaleString("zh-CN")}
                <Plus className="size-3 opacity-60" />
              </Link>

              {/* 用量额度 → 用量看板 */}
              <Link
                href="/settings/usage"
                className="hidden items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-ink lg:flex"
                title="查看用量看板"
              >
                <Zap className="size-3.5 text-warn" />
                {user.tokenBalance} tokens
              </Link>

              {/* 配置中心 */}
              <Link
                href="/settings/gateway"
                className={cn(
                  "rounded-md p-2 transition-colors",
                  pathname.startsWith("/settings") ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
                )}
                title="API 配置中心"
              >
                <Settings className="size-4.5" />
              </Link>

              <Link href="/u/me" className="transition-opacity hover:opacity-80">
                <Avatar name={user.name} hue={user.avatarHue} src={user.avatarUrl} size="md" />
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
