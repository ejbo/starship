"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Coins, Heart, Menu, Plus, Search, Settings, Shield, X, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/", label: "商店" },
  { href: "/library", label: "库" },
  { href: "/community", label: "社区" },
] as const;

interface GlobalNavProps {
  user: { name: string; avatarHue: number; avatarUrl: string | null; tokenBalance: string; credits: number; isAdmin?: boolean; unread?: number } | null;
}

export function GlobalNav({ user }: GlobalNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // 路由变化时关闭移动菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/p/") || pathname.startsWith("/run/")
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 rounded-2xl border border-line/60 bg-panel/70 px-4 shadow-[0_10px_34px_-14px_rgba(20,30,60,0.32)] backdrop-blur-xl supports-[backdrop-filter]:bg-panel/70 sm:gap-6 sm:px-6">
        {/* 移动端汉堡 */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="-ml-1 rounded-md p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink md:hidden"
          aria-label="菜单"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

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

              {/* 通知铃 */}
              <Link
                href="/notifications"
                className={cn(
                  "relative rounded-md p-2 transition-colors",
                  pathname.startsWith("/notifications") ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
                )}
                title="通知"
              >
                <Bell className="size-4.5" />
                {(user.unread ?? 0) > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold leading-4 text-white">
                    {Math.min(user.unread ?? 0, 99)}
                  </span>
                )}
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

      {/* 移动端菜单 */}
      {menuOpen && (
        <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-line/60 bg-panel/95 px-3 py-2 shadow-lg backdrop-blur-xl md:hidden">
          <nav className="flex flex-col">
            {[
              { href: "/", label: "商店", icon: null },
              { href: "/library", label: "库", icon: null },
              { href: "/community", label: "社区", icon: null },
              ...(user
                ? [
                    { href: "/notifications", label: "通知", icon: Bell },
                    { href: "/wishlist", label: "心愿单", icon: Heart },
                    { href: "/wallet", label: "钱包", icon: Coins },
                    { href: "/developer", label: "开发者中心", icon: null },
                  ]
                : []),
              ...(user?.isAdmin ? [{ href: "/admin", label: "管理后台", icon: Shield }] : []),
            ].map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium",
                    isActive(l.href) ? "bg-accent/8 text-accent" : "text-dim",
                  )}
                >
                  {Icon && <Icon className="size-4" />}
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
