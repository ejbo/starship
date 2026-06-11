"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/admin", label: "产品上架" },
  { href: "/admin/banners", label: "首页 Banner" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/products") : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              active ? "bg-accent/8 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
