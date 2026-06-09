import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export interface ChatMessage {
  from: "me" | "friend";
  body: string;
  at: string;
}

/** 与某好友的会话历史（按时间升序） */
export async function getConversation(handle: string): Promise<ChatMessage[]> {
  const userId = await getSessionUserId();
  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) return [];

  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: userId, toId: other.id },
        { fromId: other.id, toId: userId },
      ],
    },
    orderBy: { at: "asc" },
    select: { fromId: true, body: true, at: true },
  });
  return rows.map((m) => ({ from: m.fromId === userId ? "me" : "friend", body: m.body, at: m.at }));
}

export async function sendMessage(handle: string, body: string): Promise<ChatMessage> {
  const userId = await getSessionUserId();
  const clean = body.trim();
  if (!clean) throw new Error("消息不能为空");
  const other = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
  if (!other) throw new Error("用户不存在");

  const at = new Date().toISOString();
  await prisma.message.create({ data: { fromId: userId, toId: other.id, body: clean, at } });
  return { from: "me", body: clean, at };
}
