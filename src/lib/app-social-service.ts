import "server-only";
import { prisma } from "@/lib/db";
import { derivePresence } from "@/lib/friends-service";
import type { PresenceKind } from "@/lib/types";

/**
 * 给外部应用（经 OAuth）用的社交数据：好友 + 在线状态 + 每位好友的未读私聊数。
 * 故意只暴露安全子集（不含 remark/level/banner 等）。供应用内悬浮好友 dock。
 */
export interface AppFriend {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  presence: { kind: PresenceKind; detail?: string; appSlug?: string };
  unread: number;
}

async function friendIds(userId: string): Promise<string[]> {
  const edges = await prisma.friendEdge.findMany({
    where: { status: "accepted", OR: [{ aId: userId }, { bId: userId }] },
    select: { aId: true, bId: true },
  });
  return edges.map((e) => (e.aId === userId ? e.bId : e.aId));
}

const rank = (k: PresenceKind): number => ({ using: 0, meeting: 1, online: 2, offline: 3 })[k];

export async function getAppFriends(userId: string): Promise<AppFriend[]> {
  const ids = await friendIds(userId);
  if (ids.length === 0) return [];
  const [users, unreadRows] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarHue: true,
        avatarUrl: true,
        lastSeenAt: true,
        currentActivity: true,
        currentActivitySlug: true,
        activityAt: true,
        presenceKind: true,
        presenceDetail: true,
      },
    }),
    prisma.message.groupBy({
      by: ["fromId"],
      where: { toId: userId, read: false, fromId: { in: ids } },
      _count: { _all: true },
    }),
  ]);
  const unreadByFrom = new Map(unreadRows.map((r) => [r.fromId, r._count._all]));
  return users
    .map((u) => ({
      handle: u.handle,
      name: u.name,
      avatarHue: u.avatarHue,
      avatarUrl: u.avatarUrl,
      presence: derivePresence(u),
      unread: unreadByFrom.get(u.id) ?? 0,
    }))
    .sort((a, b) => rank(a.presence.kind) - rank(b.presence.kind));
}
