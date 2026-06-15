import { getCurrentUser } from "@/lib/catalog";
import { getFriendsWithPresence, getIncomingRequests, getMyFriendCode, getMyPresence } from "@/lib/friends-service";
import { getMyGroups } from "@/lib/group-service";
import { OverlayClient } from "./overlay-client";

export const dynamic = "force-dynamic";

/**
 * 桌面壳「Shift+Tab 覆盖层」内容：渲染平台「真实」社交（FriendsPanel），会话 cookie 直读
 * （桌面壳里所有平台视图共享同一会话分区，无需令牌/快照）。永远和平台同步。
 */
export default async function OverlayPage() {
  const user = await getCurrentUser();
  if (!user) return <OverlayClient loggedOut />;

  const [friends, requests, myCode, myPresence, groups] = await Promise.all([
    getFriendsWithPresence(),
    getIncomingRequests(),
    getMyFriendCode(),
    getMyPresence(),
    getMyGroups(),
  ]);
  const me = {
    handle: user.handle,
    name: user.name,
    avatarHue: user.avatarHue,
    avatarUrl: user.avatarUrl,
    friendCode: myCode,
    level: user.level,
    badge: user.badges[0] ?? null,
    bannerUrl: user.bannerUrl,
    presence: myPresence,
  };
  return <OverlayClient me={me} friends={friends} groups={groups} requests={requests} />;
}
