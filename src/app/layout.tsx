import type { Metadata } from "next";
import { FriendsDock } from "@/components/friends/friends-dock";
import { GlobalNav } from "@/components/global-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser, getFriends } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: "星港 StarPort",
  description: "一站式 AI 应用、模型与 Agent 平台",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <GlobalNav userName={user.name} userHue={user.avatarHue} tokenBalance={user.tokenBalance} />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
        <FriendsDock friends={getFriends()} />
      </body>
    </html>
  );
}
