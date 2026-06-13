import "server-only";
import { fanoutDm } from "@/lib/agent-service";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export type MessageKind = "text" | "image" | "file";

export interface ChatMessage {
  id: string;
  from: "me" | "friend";
  kind: MessageKind;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  at: string;
}

export interface ConversationPage {
  messages: ChatMessage[];
  /** 是否还有更早的历史可加载 */
  hasMore: boolean;
}

export interface IncomingMessage {
  id: string;
  from: string; // 发送者 handle
  fromName: string;
  kind: MessageKind;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  at: string;
}

const PAGE_SIZE = 25;
const MAX_ATTACHMENT = 3_000_000; // dataURL 上限（约 2.2MB 原始）

/**
 * 取与某好友的会话「一页」。
 * - beforeIso 为空：取最新一页；
 * - beforeIso 有值：取早于它的更老一页（上滑加载历史）。
 * 返回按时间升序，外加 hasMore。
 */
export async function getConversationPage(handle: string, beforeIso?: string): Promise<ConversationPage> {
  const userId = await getSessionUserId();
  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) return { messages: [], hasMore: false };

  // 打开会话即视为已读（持久化未读角标的清除）
  await prisma.message.updateMany({ where: { fromId: other.id, toId: userId, read: false }, data: { read: true } });

  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: userId, toId: other.id },
        { fromId: other.id, toId: userId },
      ],
      ...(beforeIso ? { at: { lt: beforeIso } } : {}),
    },
    orderBy: { at: "desc" }, // 先按倒序取最近的
    take: PAGE_SIZE + 1, // 多取一条判断 hasMore
    select: { id: true, fromId: true, kind: true, body: true, attachmentUrl: true, attachmentName: true, at: true },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse(); // 截断后翻成升序
  return {
    hasMore,
    messages: page.map((m) => ({
      id: m.id,
      from: m.fromId === userId ? "me" : "friend",
      kind: m.kind as MessageKind,
      body: m.body,
      attachmentUrl: m.attachmentUrl,
      attachmentName: m.attachmentName,
      at: m.at,
    })),
  };
}

export interface SendInput {
  kind?: MessageKind;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export async function sendMessage(handle: string, body: string, input: SendInput = {}): Promise<ChatMessage> {
  const userId = await getSessionUserId();
  const kind = input.kind ?? "text";
  const clean = body.trim().slice(0, 8000);
  if (kind === "text" && !clean) throw new Error("消息不能为空");
  if (input.attachmentUrl) {
    if (!/^data:/.test(input.attachmentUrl)) throw new Error("附件格式非法");
    if (input.attachmentUrl.length > MAX_ATTACHMENT) throw new Error("附件过大（上限约 2MB）");
  }

  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) throw new Error("用户不存在");

  const at = new Date().toISOString();
  const created = await prisma.message.create({
    data: {
      fromId: userId,
      toId: other.id,
      body: clean,
      kind,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentName: input.attachmentName ?? null,
      at,
    },
    select: { id: true },
  });
  // 对方是 agent 时唤醒它（本地 → 入队给连接器；托管 → 平台生成回复）
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { handle: true, name: true, kind: true } });
  await fanoutDm({
    fromId: userId,
    fromHandle: me.handle,
    fromName: me.name,
    fromKind: me.kind,
    body: clean,
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    toId: other.id,
  });
  return {
    id: created.id,
    from: "me",
    kind,
    body: clean,
    attachmentUrl: input.attachmentUrl ?? null,
    attachmentName: input.attachmentName ?? null,
    at,
  };
}

/** 各好友发给我的未读消息数（恢复持久化未读角标用） */
export async function getUnreadCounts(): Promise<Record<string, number>> {
  const userId = await getSessionUserId();
  const groups = await prisma.message.groupBy({
    by: ["fromId"],
    where: { toId: userId, read: false },
    _count: { id: true },
  });
  if (groups.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((g) => g.fromId) } },
    select: { id: true, handle: true },
  });
  const handleById = new Map(users.map((u) => [u.id, u.handle]));
  const counts: Record<string, number> = {};
  for (const g of groups) {
    const h = handleById.get(g.fromId);
    if (h) counts[h] = g._count.id;
  }
  return counts;
}

/**
 * (sinceIso, untilIso] 区间内发给我的新消息（轮询用）。
 * until 上界必须与游标推进值一致，否则查询执行期间落库的消息会在下一轮重复投递。
 */
export async function getIncomingSince(sinceIso: string, untilIso: string): Promise<IncomingMessage[]> {
  const userId = await getSessionUserId();
  const rows = await prisma.message.findMany({
    where: { toId: userId, at: { gt: sinceIso, lte: untilIso } },
    orderBy: { at: "asc" },
    select: {
      id: true,
      kind: true,
      body: true,
      attachmentUrl: true,
      attachmentName: true,
      at: true,
      from: { select: { handle: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    from: r.from.handle,
    fromName: r.from.name,
    kind: r.kind as MessageKind,
    body: r.body,
    attachmentUrl: r.attachmentUrl,
    attachmentName: r.attachmentName,
    at: r.at,
  }));
}
