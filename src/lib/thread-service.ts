import "server-only";
import { after } from "next/server";
import { aggregateReactions } from "@/lib/chat-interactions";
import { fanoutDm } from "@/lib/agent-service";
import { prisma } from "@/lib/db";
import { GatewayError, runGatewayChat } from "@/lib/gateway-core";
import { getSessionUserId } from "@/lib/session";
import { replyToSelect, toReplyPreview, type ChatMessage, type ConversationPage, type MessageKind, type SendInput } from "@/lib/message-service";

const PAGE_SIZE = 25;
const MAX_ATTACHMENT = 3_000_000;

export interface AgentThreadView {
  id: string;
  title: string;
  createdAt: string;
  lastAt: string;
}

/** 校验线程归属当前用户，返回 { id, agentId } */
async function ownedThread(threadId: string) {
  const userId = await getSessionUserId();
  const t = await prisma.agentThread.findUnique({ where: { id: threadId }, select: { id: true, ownerId: true, agentId: true } });
  if (!t || t.ownerId !== userId) throw new Error("会话不存在或无权限");
  return { ...t, userId };
}

/** 列出与某 agent 的全部会话线程（最近活动倒序）。首次进入自动建线程，并把历史 null 私聊归入「默认对话」。 */
export async function listAgentThreads(agentHandle: string): Promise<AgentThreadView[]> {
  const userId = await getSessionUserId();
  const agent = await prisma.user.findUnique({ where: { handle: agentHandle }, select: { id: true, kind: true } });
  if (!agent || agent.kind !== "agent") return [];
  let threads = await prisma.agentThread.findMany({ where: { ownerId: userId, agentId: agent.id }, orderBy: { lastAt: "desc" } });
  if (threads.length === 0) {
    const legacy = await prisma.message.count({
      where: { threadId: null, OR: [{ fromId: userId, toId: agent.id }, { fromId: agent.id, toId: userId }] },
    });
    const now = new Date().toISOString();
    const t = await prisma.agentThread.create({
      data: { ownerId: userId, agentId: agent.id, title: legacy > 0 ? "默认对话" : "", createdAt: now, lastAt: now },
    });
    if (legacy > 0) {
      await prisma.message.updateMany({
        where: { threadId: null, OR: [{ fromId: userId, toId: agent.id }, { fromId: agent.id, toId: userId }] },
        data: { threadId: t.id },
      });
    }
    threads = [t];
  }
  return threads.map((t) => ({ id: t.id, title: t.title, createdAt: t.createdAt, lastAt: t.lastAt }));
}

/** 新建一条空会话线程 */
export async function createAgentThread(agentHandle: string): Promise<AgentThreadView> {
  const userId = await getSessionUserId();
  const agent = await prisma.user.findUnique({ where: { handle: agentHandle }, select: { id: true, kind: true, agentOwnerId: true } });
  if (!agent || agent.kind !== "agent") throw new Error("不是 Agent");
  const now = new Date().toISOString();
  const t = await prisma.agentThread.create({ data: { ownerId: userId, agentId: agent.id, title: "", createdAt: now, lastAt: now } });
  return { id: t.id, title: t.title, createdAt: t.createdAt, lastAt: t.lastAt };
}

export async function renameAgentThread(threadId: string, title: string): Promise<void> {
  await ownedThread(threadId);
  await prisma.agentThread.update({ where: { id: threadId }, data: { title: title.trim().slice(0, 60) } });
}

export async function deleteAgentThread(threadId: string): Promise<void> {
  const t = await ownedThread(threadId);
  await prisma.agentTask.deleteMany({ where: { threadId } });
  await prisma.message.deleteMany({ where: { threadId } });
  await prisma.agentThread.delete({ where: { id: t.id } });
}

/** 取某线程一页消息（升序 + hasMore）；打开即标记该线程内 agent 发来的消息为已读 */
export async function getThreadPage(threadId: string, beforeIso?: string): Promise<ConversationPage> {
  const t = await ownedThread(threadId);
  await prisma.message.updateMany({ where: { threadId, fromId: t.agentId, toId: t.userId, read: false }, data: { read: true } });
  const rows = await prisma.message.findMany({
    where: { threadId, ...(beforeIso ? { at: { lt: beforeIso } } : {}) },
    orderBy: { at: "desc" },
    take: PAGE_SIZE + 1,
    select: { id: true, fromId: true, kind: true, body: true, attachmentUrl: true, attachmentName: true, at: true, editedAt: true, deleted: true, updatedAt: true, replyTo: replyToSelect },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();
  const reacts = await aggregateReactions("dm", page.map((m) => m.id), t.userId);
  return {
    hasMore,
    messages: page.map((m) => ({
      id: m.id,
      from: m.fromId === t.userId ? "me" : "friend",
      kind: m.kind as MessageKind,
      body: m.deleted ? "" : m.body,
      attachmentUrl: m.deleted ? null : m.attachmentUrl,
      attachmentName: m.attachmentName,
      at: m.at,
      editedAt: m.editedAt,
      deleted: m.deleted,
      replyTo: toReplyPreview(m.replyTo),
      reactions: reacts.get(m.id) ?? [],
      updatedAt: m.updatedAt,
    })),
  };
}

/** 在某线程里发消息给 agent（唤醒 agent，回复回到该线程） */
export async function sendThreadMessage(threadId: string, body: string, input: SendInput = {}): Promise<ChatMessage> {
  const t = await ownedThread(threadId);
  const kind = input.kind ?? "text";
  const clean = body.trim().slice(0, 8000);
  if (kind === "text" && !clean) throw new Error("消息不能为空");
  if (input.attachmentUrl) {
    if (!/^data:/.test(input.attachmentUrl)) throw new Error("附件格式非法");
    if (input.attachmentUrl.length > MAX_ATTACHMENT) throw new Error("附件过大（上限约 2MB）");
  }
  const at = new Date().toISOString();
  const created = await prisma.message.create({
    data: {
      fromId: t.userId,
      toId: t.agentId,
      threadId,
      body: clean,
      kind,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentName: input.attachmentName ?? null,
      replyToId: input.replyToId ?? null,
      at,
      updatedAt: at,
    },
    select: { id: true, replyTo: replyToSelect },
  });
  await prisma.agentThread.update({ where: { id: threadId }, data: { lastAt: at } });
  const me = await prisma.user.findUniqueOrThrow({ where: { id: t.userId }, select: { handle: true, name: true, kind: true } });
  await fanoutDm({
    fromId: t.userId,
    fromHandle: me.handle,
    fromName: me.name,
    fromKind: me.kind,
    body: clean,
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    toId: t.agentId,
    threadId,
  });
  after(() => maybeTitleThread(threadId).catch(() => {}));
  return {
    id: created.id,
    from: "me",
    kind,
    body: clean,
    attachmentUrl: input.attachmentUrl ?? null,
    attachmentName: input.attachmentName ?? null,
    at,
    replyTo: toReplyPreview(created.replyTo),
    reactions: [],
    updatedAt: at,
  };
}

/** 给空标题的线程用 AI 总结一个短标题（首条/前几条消息为据；失败则回退首条消息片段） */
export async function maybeTitleThread(threadId: string): Promise<void> {
  const t = await prisma.agentThread.findUnique({ where: { id: threadId }, select: { id: true, title: true, ownerId: true } });
  if (!t || t.title.trim()) return;
  const msgs = await prisma.message.findMany({ where: { threadId }, orderBy: { at: "asc" }, take: 6, select: { body: true, from: { select: { name: true } } } });
  if (msgs.length < 2) return; // 至少一来一回再起标题
  const firstUser = msgs.find((m) => m.body.trim());
  const fallback = (firstUser?.body ?? "新对话").trim().slice(0, 20);
  let title = fallback;
  try {
    const transcript = msgs.map((m) => `${m.from.name}：${m.body}`).join("\n").slice(0, 1200);
    const res = await runGatewayChat({
      userId: t.ownerId,
      provider: "anthropic",
      prompt: `给下面这段对话起一个不超过 12 个字的简短中文标题，只输出标题本身、不要标点和引号：\n<<<\n${transcript}\n>>>`,
      productSlug: "agent-thread-title",
    });
    const t2 = res.text.trim().replace(/^["「『]|["」』]$/g, "").slice(0, 20);
    if (t2) title = t2;
  } catch (e) {
    if (!(e instanceof GatewayError)) throw e; // 网关未配置等 → 用 fallback
  }
  // 仅当仍为空时写入（避免覆盖用户期间手动改的名）
  await prisma.agentThread.updateMany({ where: { id: threadId, title: "" }, data: { title } });
}
