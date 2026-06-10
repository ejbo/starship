import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId, getSessionUserIdOrNull } from "@/lib/session";
import { normalizeFriendCode } from "@/lib/tokens";
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
