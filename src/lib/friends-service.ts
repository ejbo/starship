import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId, getSessionUserIdOrNull } from "@/lib/session";
import { normalizeFriendCode } from "@/lib/tokens";
import type { AppIconArt, Friend, PresenceKind } from "@/lib/types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const ACTIVITY_WINDOW_MS = 10 * 60 * 1000;

/** 真实信号优先，回退到种子/兜底展示状态 */
export function derivePresence(u: {
  lastSeenAt: string | null;
  currentActivity: string | null;
  currentActivitySlug: string | null;
  activityAt: string | null;
  presenceKind: string;
  presenceDetail: string | null;
}): { kind: PresenceKind; detail?: string; appSlug?: string } {
  const now = Date.now();
  if (u.currentActivity && u.activityAt && now - Date.parse(u.activityAt) < ACTIVITY_WINDOW_MS) {
    return { kind: "using", detail: u.currentActivity, appSlug: u.currentActivitySlug ?? undefined };
  }
  if (u.lastSeenAt && now - Date.parse(u.lastSeenAt) < ONLINE_WINDOW_MS) {
    return { kind: "online" };
  }
  return { kind: u.presenceKind as PresenceKind, detail: u.presenceDetail ?? undefined };
}

export type DerivedPresence = { kind: PresenceKind; detail?: string; appSlug?: string };

/**
 * 当前用户自己的状态：本人正在会话中 → 恒「在线」；若在用应用且未过期 → 「正在使用 X」。
 * 用于社交坞顶栏与个人主页的自我状态展示（不能照搬好友逻辑，否则会落到种子兜底）。
 */
export async function getMyPresence(): Promise<DerivedPresence> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return { kind: "offline" };
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentActivity: true, currentActivitySlug: true, activityAt: true },
  });
  if (!u) return { kind: "offline" };
  if (u.currentActivity && u.activityAt && Date.now() - Date.parse(u.activityAt) < ACTIVITY_WINDOW_MS) {
    return { kind: "using", detail: u.currentActivity, appSlug: u.currentActivitySlug ?? undefined };
  }
  return { kind: "online" };
}

/** 更新当前用户的最近活跃时间（在已登录布局调用） */
export async function touchPresence(): Promise<void> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return;
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date().toISOString() } });
}

/** 启动应用时上报"正在使用 X"（slug 让好友可直达其商店页） */
export async function setActivity(activity: string, slug?: string): Promise<void> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return;
  const now = new Date().toISOString();
  await prisma.user.update({
    where: { id: userId },
    data: { currentActivity: activity, currentActivitySlug: slug ?? null, activityAt: now, lastSeenAt: now },
  });
}

export async function friendIdsOf(userId: string): Promise<string[]> {
  const edges = await prisma.friendEdge.findMany({
    where: { status: "accepted", OR: [{ aId: userId }, { bId: userId }] },
    select: { aId: true, bId: true },
  });
  return edges.map((e) => (e.aId === userId ? e.bId : e.aId));
}

/** Friend 映射所需的 User 字段（group-service 复用） */
export const friendUserSelect = {
  id: true,
  handle: true,
  name: true,
  avatarHue: true,
  avatarUrl: true,
  level: true,
  badges: true,
  profileBannerUrl: true,
  lastSeenAt: true,
  currentActivity: true,
  currentActivitySlug: true,
  activityAt: true,
  presenceKind: true,
  presenceDetail: true,
} as const;

type FriendUserRow = {
  id: string;
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  level: number;
  badges: unknown;
  profileBannerUrl: string | null;
  lastSeenAt: string | null;
  currentActivity: string | null;
  currentActivitySlug: string | null;
  activityAt: string | null;
  presenceKind: string;
  presenceDetail: string | null;
};

export function toFriend(u: FriendUserRow, remark: string | null): Friend {
  const badges = (u.badges as { label: string; icon: string }[]) ?? [];
  return {
    handle: u.handle,
    name: u.name,
    remark,
    avatarHue: u.avatarHue,
    avatarUrl: u.avatarUrl,
    level: u.level,
    lastSeenAt: u.lastSeenAt,
    bannerUrl: u.profileBannerUrl,
    badge: badges[0] ?? null,
    presence: derivePresence(u),
  };
}

/**
 * 给「正在使用」的好友补应用小图标：优先按 slug 查产品，
 * 种子兜底状态没有 slug 时按应用名匹配。原地修改 presence.appIcon / appSlug。
 */
export async function attachAppIcons(friends: Friend[]): Promise<void> {
  const using = friends.filter((f) => f.presence.kind === "using" && f.presence.detail);
  if (using.length === 0) return;
  const slugs = [...new Set(using.map((f) => f.presence.appSlug).filter((s): s is string => !!s))];
  const names = [...new Set(using.filter((f) => !f.presence.appSlug).map((f) => f.presence.detail!))];
  const products = await prisma.product.findMany({
    where: { OR: [{ slug: { in: slugs } }, ...names.map((n) => ({ name: { contains: n } }))] },
    select: { slug: true, name: true, capsuleUrl: true, hueA: true, hueB: true, icon: true },
  });
  const art = (p: (typeof products)[number]): AppIconArt => ({ capsuleUrl: p.capsuleUrl, hueA: p.hueA, hueB: p.hueB, icon: p.icon });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  // 种子兜底状态只有应用名：放宽到「互相包含」（如 "银河阅读器" ↔ "银河阅读器 Galaxy Reader"）
  const byName = (detail: string) => products.find((p) => p.name === detail || p.name.includes(detail) || detail.includes(p.name));
  for (const f of using) {
    const p = (f.presence.appSlug && bySlug.get(f.presence.appSlug)) || byName(f.presence.detail!);
    if (p) {
      f.presence.appIcon = art(p);
      f.presence.appSlug ??= p.slug;
    }
  }
}

/** 当前用户的好友（含派生在线状态、备注、头像、应用图标） */
export async function getFriendsWithPresence(): Promise<Friend[]> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return [];
  const ids = await friendIdsOf(userId);
  const [users, notes] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: friendUserSelect }),
    prisma.friendNote.findMany({ where: { ownerUserId: userId, targetUserId: { in: ids } } }),
  ]);
  const remarkByTarget = new Map(notes.map((n) => [n.targetUserId, n.remark]));
  const friends = users
    .map((u) => toFriend(u, remarkByTarget.get(u.id) ?? null))
    .sort(compareFriends);
  await attachAppIcons(friends);
  return friends;
}

function rank(kind: PresenceKind): number {
  return { using: 0, meeting: 1, online: 2, offline: 3 }[kind];
}

/** 状态优先；离线之间按最后在线时间新→旧（Steam 同款排序） */
export function compareFriends(a: Friend, b: Friend): number {
  const d = rank(a.presence.kind) - rank(b.presence.kind);
  if (d !== 0) return d;
  if (a.presence.kind === "offline") return (b.lastSeenAt ?? "").localeCompare(a.lastSeenAt ?? "");
  return a.name.localeCompare(b.name);
}

export interface FriendWithUsage {
  friend: Friend;
  usageMinutes: number;
  lastUsedAt: string | null;
}

/** 拥有指定产品的好友（含该产品使用时长 + 派生在线状态）——库详情页「哪些好友在玩」。 */
export async function getFriendsWithProduct(productId: string): Promise<FriendWithUsage[]> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return [];
  const ids = await friendIdsOf(userId);
  if (ids.length === 0) return [];
  const [users, notes] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids }, library: { some: { productId } } },
      select: {
        ...friendUserSelect,
        library: { where: { productId }, select: { usageMinutes: true, lastUsedAt: true } },
      },
    }),
    prisma.friendNote.findMany({ where: { ownerUserId: userId, targetUserId: { in: ids } } }),
  ]);
  const remarkByTarget = new Map(notes.map((n) => [n.targetUserId, n.remark]));
  const result = users
    .map((u) => ({
      friend: toFriend(u, remarkByTarget.get(u.id) ?? null),
      usageMinutes: u.library[0]?.usageMinutes ?? 0,
      lastUsedAt: u.library[0]?.lastUsedAt ?? null,
    }))
    .sort((a, b) => compareFriends(a.friend, b.friend));
  await attachAppIcons(result.map((r) => r.friend));
  return result;
}

export interface FriendRequestView {
  edgeId: string;
  fromHandle: string;
  fromName: string;
  fromHue: number;
}

/** 待我处理的好友请求 */
export async function getIncomingRequests(): Promise<FriendRequestView[]> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return [];
  const edges = await prisma.friendEdge.findMany({
    where: { bId: userId, status: "pending" },
    select: { id: true, a: { select: { handle: true, name: true, avatarHue: true } } },
  });
  return edges.map((e) => ({
    edgeId: e.id,
    fromHandle: e.a.handle,
    fromName: e.a.name,
    fromHue: e.a.avatarHue,
  }));
}

export async function getMyFriendCode(): Promise<string | null> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { friendCode: true } });
  return u?.friendCode ?? null;
}

/** 按好友码（SP-XXXXXX）或用户名解析目标用户 */
async function resolveTarget(identifier: string): Promise<{ id: string } | null> {
  const raw = identifier.trim();
  if (!raw) return null;
  // 好友码优先（含 - 或全大写无空格的短码）
  if (/^sp-/i.test(raw) || /^[0-9a-z]{6}$/i.test(raw)) {
    const byCode = await prisma.user.findUnique({ where: { friendCode: normalizeFriendCode(raw) }, select: { id: true } });
    if (byCode) return byCode;
  }
  return prisma.user.findUnique({ where: { handle: raw.toLowerCase() }, select: { id: true } });
}

/** identifier 可为好友码或用户名 */
export async function sendFriendRequest(identifier: string): Promise<void> {
  const userId = await getSessionUserId();
  const target = await resolveTarget(identifier);
  if (!target) throw new Error("找不到该用户（请核对好友码或用户名）");
  if (target.id === userId) throw new Error("不能添加自己");

  const existing = await prisma.friendEdge.findFirst({
    where: {
      OR: [
        { aId: userId, bId: target.id },
        { aId: target.id, bId: userId },
      ],
    },
    select: { status: true },
  });
  if (existing) throw new Error(existing.status === "accepted" ? "你们已是好友" : "请求已存在");

  await prisma.friendEdge.create({ data: { aId: userId, bId: target.id, status: "pending" } });
}

export async function acceptFriendRequest(edgeId: string): Promise<void> {
  const userId = await getSessionUserId();
  const edge = await prisma.friendEdge.findUnique({ where: { id: edgeId }, select: { aId: true, bId: true, status: true } });
  if (!edge || edge.bId !== userId || edge.status !== "pending") return;
  await prisma.friendEdge.update({ where: { id: edgeId }, data: { status: "accepted" } });
}

export async function removeFriend(handle: string): Promise<void> {
  const userId = await getSessionUserId();
  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) return;
  await prisma.friendEdge.deleteMany({
    where: {
      OR: [
        { aId: userId, bId: other.id },
        { aId: other.id, bId: userId },
      ],
    },
  });
}

/** 设置/清除好友备注 */
export async function setFriendRemark(handle: string, remark: string): Promise<void> {
  const userId = await getSessionUserId();
  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) return;
  const clean = remark.trim().slice(0, 24);
  if (!clean) {
    await prisma.friendNote.deleteMany({ where: { ownerUserId: userId, targetUserId: other.id } });
    return;
  }
  await prisma.friendNote.upsert({
    where: { ownerUserId_targetUserId: { ownerUserId: userId, targetUserId: other.id } },
    update: { remark: clean },
    create: { ownerUserId: userId, targetUserId: other.id, remark: clean },
  });
}
