"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, KeyRound } from "lucide-react";
import { cn } from "@/lib/cn";

const tabs = [
  { href: "/settings/gateway", label: "API 配置中心", icon: KeyRound },
  { href: "/settings/usage", label: "用量看板", icon: BarChart3 },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-accent text-accent"
                : "border-transparent text-dim hover:text-ink",
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
