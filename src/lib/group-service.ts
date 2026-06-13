import "server-only";
import { fanoutGroup } from "@/lib/agent-service";
import { aggregateReactions } from "@/lib/chat-interactions";
import { prisma } from "@/lib/db";
import { attachAppIcons, compareFriends, friendIdsOf, friendUserSelect, toFriend } from "@/lib/friends-service";
import { replyToSelect, toReplyPreview, type MessageKind, type SendInput } from "@/lib/message-service";
import { getSessionUserId } from "@/lib/session";
import type { Friend } from "@/lib/types";
import type { MessageMutation, ReactionAgg, ReplyPreview } from "@/components/social/presence";

export interface GroupChannel {
  id: string;
  name: string;
  kind: "text" | "voice";
}

export interface GroupMember extends Friend {
  isMe: boolean;
  isOwner: boolean;
  isFriend: boolean;
}

export interface GroupSummary {
  id: string;
  /** 展示名：自定义名，空则按成员自动命名 */
  name: string;
  /** 自定义名原值（"" = 自动命名），改名表单用 */
  rawName: string;
  ownerHandle: string;
  channels: GroupChannel[];
  members: GroupMember[];
}

export interface GroupChatMessage {
  id: string;
  kind: MessageKind;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  at: string;
  sender: { handle: string; name: string; avatarHue: number; avatarUrl: string | null; isAgent?: boolean };
  editedAt?: string | null;
  deleted?: boolean;
  replyTo?: ReplyPreview | null;
  reactions?: ReactionAgg[];
  updatedAt?: string | null;
}

export interface GroupChannelPage {
  messages: GroupChatMessage[];
  hasMore: boolean;
}

export interface IncomingGroupMessage extends GroupChatMessage {
  groupId: string;
  channelId: string;
}

const PAGE_SIZE = 25;
const MAX_ATTACHMENT = 3_000_000;
const DEFAULT_CHANNEL = "大厅";

/** 成员名自动命名："A 和 B" / "A、B 和 C" / "A、B、C 等 n 人"（排除自己视角） */
export function autoGroupName(memberNames: string[]): string {
  const names = memberNames.slice(0, 3);
  if (memberNames.length > 3) return `${names.join("、")} 等 ${memberNames.length} 人`;
  if (names.length <= 1) return names[0] ?? "群组聊天";
  return `${names.slice(0, -1).join("、")} 和 ${names[names.length - 1]}`;
}

async function membershipOrThrow(groupId: string, userId: string) {
  const m = await prisma.chatGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true },
  });
  if (!m) throw new Error("不在该群组中");
}

/** 我加入的全部群组（含频道与成员实时状态），按创建时间新→旧 */
export async function getMyGroups(): Promise<GroupSummary[]> {
  const userId = await getSessionUserId();
  const memberships = await prisma.chatGroupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  const [groups, friendIds, notes] = await Promise.all([
    prisma.chatGroup.findMany({
      where: { id: { in: groupIds } },
      include: {
        channels: { orderBy: { sort: "asc" }, select: { id: true, name: true, kind: true } },
        members: { orderBy: { joinedAt: "asc" }, select: { user: { select: friendUserSelect } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    friendIdsOf(userId),
    prisma.friendNote.findMany({ where: { ownerUserId: userId }, select: { targetUserId: true, remark: true } }),
  ]);
  const friendSet = new Set(friendIds);
  const remarkByTarget = new Map(notes.map((n) => [n.targetUserId, n.remark]));

  const summaries = groups.map((g) => {
    const owner = g.members.find((m) => m.user.id === g.ownerId)?.user;
    const members: GroupMember[] = g.members.map((m) => ({
      ...toFriend(m.user, remarkByTarget.get(m.user.id) ?? null),
      isMe: m.user.id === userId,
      isOwner: m.user.id === g.ownerId,
      isFriend: friendSet.has(m.user.id),
    }));
    // 自动命名按入群顺序取名（稳定）；成员列表按状态排序（Steam 同款）
    const others = members.filter((m) => !m.isMe).map((m) => m.remark || m.name);
    members.sort(compareFriends);
    return {
      id: g.id,
      name: g.name || autoGroupName(others),
      rawName: g.name,
      ownerHandle: owner?.handle ?? "",
      channels: g.channels.map((c) => ({ id: c.id, name: c.name, kind: c.kind as "text" | "voice" })),
      members,
    };
  });
  await attachAppIcons(summaries.flatMap((s) => s.members));
  return summaries;
}

/** 建群：我 + 选中的好友，自带默认文字频道。返回群 id。 */
export async function createGroup(memberHandles: string[], name = ""): Promise<string> {
  const userId = await getSessionUserId();
  const friendIds = new Set(await friendIdsOf(userId));
  const users = await prisma.user.findMany({
    where: { handle: { in: memberHandles } },
    select: { id: true },
  });
  const invitees = users.filter((u) => friendIds.has(u.id));
  if (invitees.length === 0) throw new Error("至少选择一位好友");

  const now = new Date().toISOString();
  const group = await prisma.chatGroup.create({
    data: {
      name: name.trim().slice(0, 32),
      ownerId: userId,
      createdAt: now,
      channels: { create: { name: DEFAULT_CHANNEL, kind: "text", sort: 0 } },
      members: { create: [{ userId, joinedAt: now }, ...invitees.map((u) => ({ userId: u.id, joinedAt: now }))] },
    },
    select: { id: true },
  });
  return group.id;
}

/** 拉好友进群（成员都可邀请，Steam 同款） */
export async function inviteToGroup(groupId: string, handles: string[]): Promise<void> {
  const userId = await getSessionUserId();
  await membershipOrThrow(groupId, userId);
  const friendIds = new Set(await friendIdsOf(userId));
  const users = await prisma.user.findMany({ where: { handle: { in: handles } }, select: { id: true } });
  const now = new Date().toISOString();
  for (const u of users) {
    if (!friendIds.has(u.id)) continue;
    await prisma.chatGroupMember.upsert({
      where: { groupId_userId: { groupId, userId: u.id } },
      update: {},
      create: { groupId, userId: u.id, joinedAt: now },
    });
  }
}

/** 退群：群主退出移交给最早加入的成员；没人了就解散 */
export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.chatGroupMember.deleteMany({ where: { groupId, userId } });
  const rest = await prisma.chatGroupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    select: { userId: true },
    take: 1,
  });
  if (rest.length === 0) {
    await prisma.chatGroup.deleteMany({ where: { id: groupId } });
    return;
  }
  const g = await prisma.chatGroup.findUnique({ where: { id: groupId }, select: { ownerId: true } });
  if (g && g.ownerId === userId) {
    await prisma.chatGroup.update({ where: { id: groupId }, data: { ownerId: rest[0].userId } });
  }
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  const userId = await getSessionUserId();
  await membershipOrThrow(groupId, userId);
  await prisma.chatGroup.update({ where: { id: groupId }, data: { name: name.trim().slice(0, 32) } });
}

export async function createChannel(groupId: string, name: string, kind: "text" | "voice"): Promise<GroupChannel> {
  const userId = await getSessionUserId();
  await membershipOrThrow(groupId, userId);
  const clean = name.trim().slice(0, 20);
  if (!clean) throw new Error("频道名不能为空");
  const max = await prisma.chatChannel.aggregate({ where: { groupId }, _max: { sort: true } });
  const c = await prisma.chatChannel.create({
    data: { groupId, name: clean, kind, sort: (max._max.sort ?? 0) + 1 },
    select: { id: true, name: true, kind: true },
  });
  return { id: c.id, name: c.name, kind: c.kind as "text" | "voice" };
}

interface GroupRow {
  id: string;
  kind: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  at: string;
  editedAt?: string | null;
  deleted?: boolean;
  updatedAt?: string | null;
  replyTo?: { id: string; body: string; kind: string; deleted: boolean; from: { name: string } } | null;
  from: { handle: string; name: string; avatarHue: number; avatarUrl: string | null; kind: string };
}

function toGroupMessage(m: GroupRow, reactions: ReactionAgg[] = []): GroupChatMessage {
  return {
    id: m.id,
    kind: m.kind as MessageKind,
    body: m.deleted ? "" : m.body,
    attachmentUrl: m.deleted ? null : m.attachmentUrl,
    attachmentName: m.attachmentName,
    at: m.at,
    sender: { handle: m.from.handle, name: m.from.name, avatarHue: m.from.avatarHue, avatarUrl: m.from.avatarUrl, isAgent: m.from.kind === "agent" },
    editedAt: m.editedAt ?? null,
    deleted: m.deleted ?? false,
    replyTo: toReplyPreview(m.replyTo ?? null),
    reactions,
    updatedAt: m.updatedAt ?? null,
  };
}

/** 群消息 select（含交互字段） */
const groupMsgSelect = {
  id: true,
  kind: true,
  body: true,
  attachmentUrl: true,
  attachmentName: true,
  at: true,
  editedAt: true,
  deleted: true,
  updatedAt: true,
  replyTo: replyToSelect,
  from: { select: { handle: true, name: true, avatarHue: true, avatarUrl: true, kind: true } },
} as const;

/** 频道消息一页（升序 + hasMore），与私聊分页同语义 */
export async function getChannelPage(channelId: string, beforeIso?: string): Promise<GroupChannelPage> {
  const userId = await getSessionUserId();
  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId }, select: { groupId: true } });
  if (!channel) return { messages: [], hasMore: false };
  await membershipOrThrow(channel.groupId, userId);

  const rows = await prisma.groupMessage.findMany({
    where: { channelId, ...(beforeIso ? { at: { lt: beforeIso } } : {}) },
    orderBy: { at: "desc" },
    take: PAGE_SIZE + 1,
    select: groupMsgSelect,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();
  const reacts = await aggregateReactions("group", page.map((m) => m.id), userId);
  return { hasMore, messages: page.map((m) => toGroupMessage(m, reacts.get(m.id) ?? [])) };
}

export async function sendGroupMessage(channelId: string, body: string, input: SendInput = {}): Promise<GroupChatMessage> {
  const userId = await getSessionUserId();
  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId }, select: { groupId: true, kind: true } });
  if (!channel) throw new Error("频道不存在");
  if (channel.kind !== "text") throw new Error("语音频道不能发文字消息");
  await membershipOrThrow(channel.groupId, userId);

  const kind = input.kind ?? "text";
  const clean = body.trim().slice(0, 8000);
  if (kind === "text" && !clean) throw new Error("消息不能为空");
  if (input.attachmentUrl) {
    if (!/^data:/.test(input.attachmentUrl)) throw new Error("附件格式非法");
    if (input.attachmentUrl.length > MAX_ATTACHMENT) throw new Error("附件过大（上限约 2MB）");
  }

  const atNow = new Date().toISOString();
  const created = await prisma.groupMessage.create({
    data: {
      groupId: channel.groupId,
      channelId,
      fromId: userId,
      kind,
      body: clean,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentName: input.attachmentName ?? null,
      replyToId: input.replyToId ?? null,
      at: atNow,
      updatedAt: atNow,
    },
    select: groupMsgSelect,
  });
  // 群里被 @ 的 agent 成员被唤醒
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { handle: true, name: true, kind: true } });
  await fanoutGroup({
    fromId: userId,
    fromHandle: me.handle,
    fromName: me.name,
    fromKind: me.kind,
    body: clean,
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    groupId: channel.groupId,
    channelId,
  });
  return toGroupMessage(created);
}

/** (sinceIso, untilIso] 区间内、我所在群里别人发的新消息（轮询用；上界防止重复投递） */
export async function getGroupIncomingSince(sinceIso: string, untilIso: string): Promise<IncomingGroupMessage[]> {
  const userId = await getSessionUserId();
  const rows = await prisma.groupMessage.findMany({
    where: {
      at: { gt: sinceIso, lte: untilIso },
      fromId: { not: userId },
      group: { members: { some: { userId } } },
    },
    orderBy: { at: "asc" },
    select: { ...groupMsgSelect, groupId: true, channelId: true },
  });
  return rows.map((r) => ({ ...toGroupMessage(r), groupId: r.groupId, channelId: r.channelId }));
}

/** (since, until] 内、我所在群里被编辑/删除/反应变化的消息（轮询增量 patch；convKey=channelId） */
export async function getGroupMutationsSince(sinceIso: string, untilIso: string): Promise<MessageMutation[]> {
  const userId = await getSessionUserId();
  const rows = await prisma.groupMessage.findMany({
    where: { updatedAt: { gt: sinceIso, lte: untilIso }, group: { members: { some: { userId } } } },
    select: { id: true, channelId: true, body: true, editedAt: true, deleted: true, updatedAt: true },
  });
  if (rows.length === 0) return [];
  const reacts = await aggregateReactions("group", rows.map((r) => r.id), userId);
  return rows.map((r) => ({
    id: r.id,
    convKey: r.channelId,
    body: r.deleted ? "" : r.body,
    editedAt: r.editedAt,
    deleted: r.deleted,
    reactions: reacts.get(r.id) ?? [],
    updatedAt: r.updatedAt ?? r.id,
  }));
}
