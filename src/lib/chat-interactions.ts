import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import type { ReactionAgg } from "@/components/social/presence";

/** dm = 私聊 Message；group = GroupMessage */
export type Scope = "dm" | "group";

/** 刷新某消息的变更游标，让轮询 mutation 通道（updatedAt>since）感知到。这是反应/编辑/删除能传播的命门。 */
export async function touchMessageUpdated(scope: Scope, messageId: string, at: string): Promise<void> {
  if (scope === "dm") await prisma.message.updateMany({ where: { id: messageId }, data: { updatedAt: at } });
  else await prisma.groupMessage.updateMany({ where: { id: messageId }, data: { updatedAt: at } });
}

/** 批量聚合一组消息的反应 → Map<messageId, ReactionAgg[]>（mine = 当前用户加过） */
export async function aggregateReactions(scope: Scope, messageIds: string[], meId: string): Promise<Map<string, ReactionAgg[]>> {
  const map = new Map<string, ReactionAgg[]>();
  if (messageIds.length === 0) return map;
  const rows = await prisma.messageReaction.findMany({
    where: { scope, messageId: { in: messageIds } },
    select: { messageId: true, emoji: true, userId: true },
  });
  const tmp = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of rows) {
    let byEmoji = tmp.get(r.messageId);
    if (!byEmoji) {
      byEmoji = new Map();
      tmp.set(r.messageId, byEmoji);
    }
    const cur = byEmoji.get(r.emoji) ?? { count: 0, mine: false };
    cur.count++;
    if (r.userId === meId) cur.mine = true;
    byEmoji.set(r.emoji, cur);
  }
  for (const [mid, byEmoji] of tmp) {
    map.set(mid, [...byEmoji.entries()].map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine })));
  }
  return map;
}

async function canTouchMessage(scope: Scope, messageId: string, userId: string): Promise<boolean> {
  if (scope === "dm") {
    return !!(await prisma.message.findFirst({ where: { id: messageId, OR: [{ fromId: userId }, { toId: userId }] }, select: { id: true } }));
  }
  return !!(await prisma.groupMessage.findFirst({ where: { id: messageId, group: { members: { some: { userId } } } }, select: { id: true } }));
}

/** 加/取消反应（幂等：已有则删，否则加），同步刷新消息 updatedAt 让其他端可见 */
export async function toggleReaction(scope: Scope, messageId: string, emoji: string): Promise<void> {
  const userId = await getSessionUserId();
  const clean = [...new Intl.Segmenter().segment(emoji.trim())].map((s) => s.segment).slice(0, 1).join("") || emoji.trim().slice(0, 8);
  if (!clean) return;
  if (!(await canTouchMessage(scope, messageId, userId))) throw new Error("无权操作该消息");
  const existing = await prisma.messageReaction.findUnique({
    where: { scope_messageId_userId_emoji: { scope, messageId, userId, emoji: clean } },
    select: { id: true },
  });
  const now = new Date().toISOString();
  if (existing) await prisma.messageReaction.delete({ where: { id: existing.id } });
  else await prisma.messageReaction.create({ data: { scope, messageId, userId, emoji: clean, at: now } });
  await touchMessageUpdated(scope, messageId, now);
}

/** 编辑消息（仅本人，文本类）。返回新 updatedAt。 */
export async function editMessage(scope: Scope, messageId: string, body: string): Promise<void> {
  const userId = await getSessionUserId();
  const clean = body.trim().slice(0, 8000);
  if (!clean) throw new Error("内容不能为空");
  const now = new Date().toISOString();
  if (scope === "dm") {
    const m = await prisma.message.findUnique({ where: { id: messageId }, select: { fromId: true, kind: true } });
    if (!m || m.fromId !== userId) throw new Error("只能编辑自己的消息");
    if (m.kind !== "text") throw new Error("只能编辑文字消息");
    await prisma.message.update({ where: { id: messageId }, data: { body: clean, editedAt: now, updatedAt: now } });
  } else {
    const m = await prisma.groupMessage.findUnique({ where: { id: messageId }, select: { fromId: true, kind: true } });
    if (!m || m.fromId !== userId) throw new Error("只能编辑自己的消息");
    if (m.kind !== "text") throw new Error("只能编辑文字消息");
    await prisma.groupMessage.update({ where: { id: messageId }, data: { body: clean, editedAt: now, updatedAt: now } });
  }
}

/** 删除消息（软删，本人；群主可删任意群消息）。保留行占位「已删除」。 */
export async function deleteMessage(scope: Scope, messageId: string): Promise<void> {
  const userId = await getSessionUserId();
  const now = new Date().toISOString();
  if (scope === "dm") {
    const m = await prisma.message.findUnique({ where: { id: messageId }, select: { fromId: true } });
    if (!m || m.fromId !== userId) throw new Error("只能删除自己的消息");
    await prisma.message.update({ where: { id: messageId }, data: { deleted: true, body: "", attachmentUrl: null, updatedAt: now } });
  } else {
    const m = await prisma.groupMessage.findUnique({ where: { id: messageId }, select: { fromId: true, group: { select: { ownerId: true } } } });
    if (!m) throw new Error("消息不存在");
    if (m.fromId !== userId && m.group.ownerId !== userId) throw new Error("只能删除自己的消息");
    await prisma.groupMessage.update({ where: { id: messageId }, data: { deleted: true, body: "", attachmentUrl: null, updatedAt: now } });
  }
  await prisma.messageReaction.deleteMany({ where: { scope, messageId } });
}
