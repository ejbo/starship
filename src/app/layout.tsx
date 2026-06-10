import type { Metadata } from "next";
import { SocialLayer } from "@/components/social/social-layer";
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
          user={user ? { name: user.name, avatarHue: user.avatarHue, avatarUrl: user.avatarUrl, tokenBalance: user.tokenBalance, credits: user.credits } : null}
        />
        <div className="min-h-[70vh]">{children}</div>
        <SiteFooter />
        {user && (
          <SocialLayer
            me={{ handle: user.handle, name: user.name, avatarHue: user.avatarHue, avatarUrl: user.avatarUrl, friendCode: myCode }}
            initialFriends={friends}
            initialRequests={requests}
          />
        )}
      </body>
    </html>
  );
}
