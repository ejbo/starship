import type { Metadata } from "next";
import { SocialLayer } from "@/components/social/social-layer";
import { GlobalNav } from "@/components/global-nav";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUser } from "@/lib/catalog";
import { getFriendsWithPresence, getIncomingRequests, getMyFriendCode, getMyPresence, touchPresence } from "@/lib/friends-service";
import { getMyGroups } from "@/lib/group-service";
import { getUnreadCount } from "@/lib/notification-service";
import { getWishlistCount } from "@/lib/wishlist-service";
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
  const [friends, requests, myCode, unread, myPresence, groups, wishCount] = user
    ? await Promise.all([getFriendsWithPresence(), getIncomingRequests(), getMyFriendCode(), getUnreadCount(), getMyPresence(), getMyGroups(), getWishlistCount()])
    : [[], [], null, 0, { kind: "offline" as const }, [], 0];

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <GlobalNav
          user={user ? { name: user.name, avatarHue: user.avatarHue, avatarUrl: user.avatarUrl, tokenBalance: user.tokenBalance, gatewayTokens: user.gatewayTokens, credits: user.credits, isAdmin: user.isAdmin, unread } : null}
          wishCount={wishCount}
        />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
        {user && (
          <SocialLayer
            me={{
              handle: user.handle,
              name: user.name,
              avatarHue: user.avatarHue,
              avatarUrl: user.avatarUrl,
              friendCode: myCode,
              level: user.level,
              badge: user.badges[0] ?? null,
              bannerUrl: user.bannerUrl,
              presence: myPresence,
            }}
            initialFriends={friends}
            initialGroups={groups}
            initialRequests={requests}
          />
        )}
      </body>
    </html>
  );
}
