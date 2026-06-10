import type { Metadata } from "next";
import { FriendsDock } from "@/components/friends/friends-dock";
import { GlobalNav } from "@/components/global-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/catalog";
import { getFriendsWithPresence, getIncomingRequests, getMyFriendCode, touchPresence } from "@/lib/friends-service";
import "./globals.css";

export const metadata: Metadata = {
  title: "星港 StarPort",
  description: "一站式 AI 应用、模型与 Agent 平台",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (user) await touchPresence();
  const [friends, requests, myCode] = user
    ? await Promise.all([getFriendsWithPresence(), getIncomingRequests(), getMyFriendCode()])
    : [[], [], null];

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <GlobalNav
          user={user ? { name: user.name, avatarHue: user.avatarHue, tokenBalance: user.tokenBalance } : null}
        />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
        {user && (
          <FriendsDock
            me={{ name: user.name, avatarHue: user.avatarHue, friendCode: myCode }}
            friends={friends}
            requests={requests}
          />
        )}
      </body>
    </html>
  );
}
