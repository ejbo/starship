import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId, getSessionUserIdOrNull } from "@/lib/session";
import type { Friend, PresenceKind } from "@/lib/types";

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const ACTIVITY_WINDOW_MS = 10 * 60 * 1000;

/** 真实信号优先，回退到种子/兜底展示状态 */
function derivePresence(u: {
  lastSeenAt: string | null;
  currentActivity: string | null;
  activityAt: string | null;
  presenceKind: string;
  presenceDetail: string | null;
}): { kind: PresenceKind; detail?: string } {
  const now = Date.now();
  if (u.currentActivity && u.activityAt && now - Date.parse(u.activityAt) < ACTIVITY_WINDOW_MS) {
    return { kind: "using", detail: u.currentActivity };
  }
  if (u.lastSeenAt && now - Date.parse(u.lastSeenAt) < ONLINE_WINDOW_MS) {
    return { kind: "online" };
  }
  return { kind: u.presenceKind as PresenceKind, detail: u.presenceDetail ?? undefined };
}

/** 更新当前用户的最近活跃时间（在已登录布局调用） */
export async function touchPresence(): Promise<void> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return;
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date().toISOString() } });
}

/** 启动应用时上报"正在使用 X" */
export async function setActivity(activity: string): Promise<void> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return;
  const now = new Date().toISOString();
  await prisma.user.update({
    where: { id: userId },
    data: { currentActivity: activity, activityAt: now, lastSeenAt: now },
  });
}

async function friendIdsOf(userId: string): Promise<string[]> {
  const edges = await prisma.friendEdge.findMany({
    where: { status: "accepted", OR: [{ aId: userId }, { bId: userId }] },
    select: { aId: true, bId: true },
  });
  return edges.map((e) => (e.aId === userId ? e.bId : e.aId));
}

/** 当前用户的好友（含派生在线状态） */
export async function getFriendsWithPresence(): Promise<Friend[]> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return [];
  const ids = await friendIdsOf(userId);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      handle: true,
      name: true,
      avatarHue: true,
      level: true,
      lastSeenAt: true,
      currentActivity: true,
      activityAt: true,
      presenceKind: true,
      presenceDetail: true,
    },
  });
  return users
    .map((u) => ({
      handle: u.handle,
      name: u.name,
      avatarHue: u.avatarHue,
      level: u.level,
      presence: derivePresence(u),
    }))
    .sort((a, b) => rank(a.presence.kind) - rank(b.presence.kind));
}

function rank(kind: PresenceKind): number {
  return { using: 0, meeting: 1, online: 2, offline: 3 }[kind];
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

export async function sendFriendRequest(handle: string): Promise<void> {
  const userId = await getSessionUserId();
  const target = await prisma.user.findUnique({ where: { handle: handle.trim().toLowerCase() }, select: { id: true } });
  if (!target) throw new Error("找不到该用户");
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
  await prisma.friendEdge.updateMany({
    where: { id: edgeId, bId: userId, status: "pending" },
    data: { status: "accepted" },
  });
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
