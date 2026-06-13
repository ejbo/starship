import "server-only";
import { prisma } from "@/lib/db";
import { derivePresence } from "@/lib/friends-service";
import type { Friend, PresenceKind } from "@/lib/types";

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

/** 嵌入式好友面板（/widget/friends）的数据快照：复用平台真实 FriendsPanel 的入参形状。 */
export interface AppSocialSnapshot {
  me: {
    handle: string;
    name: string;
    avatarHue: number;
    avatarUrl: string | null;
    friendCode: string | null;
    level: number;
    badge: null;
    bannerUrl: null;
    presence: { kind: PresenceKind; detail?: string; appSlug?: string };
  } | null;
  friends: Friend[];
  groups: never[];
  requestCount: number;
}

/**
 * 给应用内嵌好友面板用的快照（OAuth 令牌鉴权，scope social:read）。
 * 映射到平台 FriendsPanel 的 Me/Friend 形状；level/badge/banner/分组等富数据暂不经 OAuth 暴露
 * （按需逐步开放），缺省给安全默认值——面板照常渲染真实好友 + 在线状态。
 */
export async function getAppSocialSnapshot(userId: string): Promise<AppSocialSnapshot> {
  const [meRow, appFriends] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        handle: true,
        name: true,
        avatarHue: true,
        avatarUrl: true,
        friendCode: true,
        level: true,
        lastSeenAt: true,
        currentActivity: true,
        currentActivitySlug: true,
        activityAt: true,
        presenceKind: true,
        presenceDetail: true,
      },
    }),
    getAppFriends(userId),
  ]);

  const friends: Friend[] = appFriends.map((f) => ({
    handle: f.handle,
    name: f.name,
    remark: null,
    avatarHue: f.avatarHue,
    avatarUrl: f.avatarUrl,
    level: 0,
    lastSeenAt: null,
    bannerUrl: null,
    badge: null,
    isAgent: false,
    presence: { kind: f.presence.kind, detail: f.presence.detail, appSlug: f.presence.appSlug, appIcon: null },
  }));

  const me = meRow
    ? {
        handle: meRow.handle,
        name: meRow.name,
        avatarHue: meRow.avatarHue,
        avatarUrl: meRow.avatarUrl ?? null,
        friendCode: meRow.friendCode ?? null,
        level: meRow.level ?? 0,
        badge: null as null,
        bannerUrl: null as null,
        presence: derivePresence(meRow),
      }
    : null;

  return { me, friends, groups: [], requestCount: 0 };
}
