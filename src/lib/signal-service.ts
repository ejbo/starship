import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/**
 * 会话级实时信号（typing + 已读），全走 2s 轮询。scope 对称设计：
 * DM = "dm:" + sorted(myId, otherId)（双方写同一 scope）；频道 = "ch:" + channelId。
 * 这样「谁在我打开的会话里打字 / 读到哪」一次按 scope 查即可。
 */

const TYPING_TTL_MS = 5000;

function pairScope(a: string, b: string): string {
  return "dm:" + [a, b].sort().join("~");
}

/** convKey（handle / c:<channelId> / t:<threadId>）→ 规范 scope */
async function toScope(convKey: string, myId: string): Promise<string | null> {
  if (convKey.startsWith("c:")) return "ch:" + convKey.slice(2);
  if (convKey.startsWith("t:")) return "th:" + convKey.slice(2); // agent 多会话线程
  const other = await prisma.user.findUnique({ where: { handle: convKey }, select: { id: true } });
  return other ? pairScope(myId, other.id) : null;
}

export async function reportTyping(convKey: string): Promise<void> {
  const userId = await getSessionUserId();
  const scope = await toScope(convKey, userId);
  if (!scope) return;
  const now = new Date().toISOString();
  const channelId = convKey.startsWith("c:") ? convKey.slice(2) : null;
  await prisma.chatSignal.upsert({
    where: { userId_scope: { userId, scope } },
    update: { typingAt: now, channelId },
    create: { userId, scope, typingAt: now, channelId },
  });
}

export async function reportRead(convKey: string, lastAt: string): Promise<void> {
  const userId = await getSessionUserId();
  const scope = await toScope(convKey, userId);
  if (!scope) return;
  const channelId = convKey.startsWith("c:") ? convKey.slice(2) : null;
  await prisma.chatSignal.upsert({
    where: { userId_scope: { userId, scope } },
    update: { readAt: lastAt, channelId },
    create: { userId, scope, readAt: lastAt, channelId },
  });
  // 活跃查看时同步把已读消息在库里标 read=true（此前只有「打开会话」时标记，
  // 导致开着窗口收到/读过的消息在 DB 仍是未读 → 重载后持久化角标虚高）。
  if (convKey.startsWith("t:")) {
    // agent 多会话：标记该线程内发给我的、截至 lastAt 的消息为已读
    const threadId = convKey.slice(2);
    const t = await prisma.agentThread.findUnique({ where: { id: threadId }, select: { ownerId: true } });
    if (t && t.ownerId === userId) {
      await prisma.message.updateMany({ where: { threadId, toId: userId, read: false, at: { lte: lastAt } }, data: { read: true } });
    }
  } else if (!channelId) {
    const other = await prisma.user.findUnique({ where: { handle: convKey }, select: { id: true } });
    if (other) {
      await prisma.message.updateMany({
        where: { fromId: other.id, toId: userId, read: false, at: { lte: lastAt } },
        data: { read: true },
      });
    }
  }
}

export interface TypingView {
  convKey: string;
  typers: { handle: string; name: string }[];
}
export interface ReadView {
  convKey: string;
  readAt: string;
}

/** 轮询读侧：只查我「打开的会话」，避免全表扫 */
export async function getSignals(openConvKeys: string[]): Promise<{ typing: TypingView[]; reads: ReadView[] }> {
  const userId = await getSessionUserId();
  if (openConvKeys.length === 0) return { typing: [], reads: [] };

  const scopeToConv = new Map<string, string>();
  for (const ck of openConvKeys) {
    const scope = await toScope(ck, userId);
    if (scope) scopeToConv.set(scope, ck);
  }
  const scopes = [...scopeToConv.keys()];
  if (scopes.length === 0) return { typing: [], reads: [] };

  const rows = await prisma.chatSignal.findMany({
    where: { scope: { in: scopes }, userId: { not: userId } },
    select: { userId: true, scope: true, typingAt: true, readAt: true },
  });

  const cutoff = new Date(Date.now() - TYPING_TTL_MS).toISOString();
  const typingRows = rows.filter((r) => r.typingAt && r.typingAt > cutoff);
  const ids = [...new Set(typingRows.map((r) => r.userId))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, handle: true, name: true } }) : [];
  const byId = new Map(users.map((u) => [u.id, u]));

  const typingByConv = new Map<string, { handle: string; name: string }[]>();
  for (const r of typingRows) {
    const ck = scopeToConv.get(r.scope);
    const u = byId.get(r.userId);
    if (!ck || !u) continue;
    const arr = typingByConv.get(ck) ?? [];
    arr.push({ handle: u.handle, name: u.name });
    typingByConv.set(ck, arr);
  }

  // 已读：DM 取对方在共享 scope 里的 readAt（群已读暂不做 UI）
  const reads: ReadView[] = [];
  for (const r of rows) {
    if (!r.readAt || !r.scope.startsWith("dm:")) continue;
    const ck = scopeToConv.get(r.scope);
    if (ck) reads.push({ convKey: ck, readAt: r.readAt });
  }

  return { typing: [...typingByConv.entries()].map(([convKey, typers]) => ({ convKey, typers })), reads };
}
