import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/**
 * 语音房间在场层（roomId = 语音频道 ChatChannel.id）。纯轮询同步，裸 http 可用。
 * 加入=upsert，离开=delete，每轮 poll 刷 lastSeenAt；读时 6s 窗口判活兜掉关页面没发离开。
 * WebRTC 真音频是后续（需 HTTPS + 信令），本层只做「谁在房间 / 麦克风开关」——这本身即可用的会议骨架。
 */

const ROOM_ALIVE_MS = 6000;

export interface VoiceRoomMember {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  micOn: boolean;
  speaking: boolean;
  isMe: boolean;
}
export interface VoiceRoomSnapshot {
  roomId: string;
  members: VoiceRoomMember[];
}

async function assertVoiceChannelMember(roomId: string, userId: string): Promise<void> {
  const ch = await prisma.chatChannel.findUnique({ where: { id: roomId }, select: { kind: true, groupId: true } });
  if (!ch || ch.kind !== "voice") throw new Error("不是语音频道");
  const m = await prisma.chatGroupMember.findUnique({ where: { groupId_userId: { groupId: ch.groupId, userId } }, select: { id: true } });
  if (!m) throw new Error("不在该群组中");
}

export async function joinVoiceRoom(roomId: string): Promise<void> {
  const userId = await getSessionUserId();
  await assertVoiceChannelMember(roomId, userId);
  const now = new Date().toISOString();
  await prisma.voiceParticipant.upsert({
    where: { roomId_userId: { roomId, userId } },
    update: { lastSeenAt: now, micOn: true },
    create: { roomId, userId, joinedAt: now, lastSeenAt: now, micOn: true },
  });
}

export async function leaveVoiceRoom(roomId: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.voiceParticipant.deleteMany({ where: { roomId, userId } });
}

export async function setMic(roomId: string, micOn: boolean): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.voiceParticipant.updateMany({ where: { roomId, userId }, data: { micOn } });
}

/** 每轮 poll：刷新我所有在场行的 lastSeenAt（保活） */
export async function heartbeatVoiceRooms(): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.voiceParticipant.updateMany({ where: { userId }, data: { lastSeenAt: new Date().toISOString() } });
}

/** 取指定语音频道们的在场快照（过滤掉超 6s 没心跳的幽灵成员） */
export async function getVoiceRooms(roomIds: string[]): Promise<VoiceRoomSnapshot[]> {
  const userId = await getSessionUserId();
  if (roomIds.length === 0) return [];
  const cutoff = new Date(Date.now() - ROOM_ALIVE_MS).toISOString();
  const rows = await prisma.voiceParticipant.findMany({
    where: { roomId: { in: roomIds }, lastSeenAt: { gt: cutoff } },
    select: { roomId: true, userId: true, micOn: true, speaking: true },
    orderBy: { joinedAt: "asc" },
  });
  if (rows.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
    select: { id: true, handle: true, name: true, avatarHue: true, avatarUrl: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const byRoom = new Map<string, VoiceRoomMember[]>();
  for (const r of rows) {
    const u = byId.get(r.userId);
    if (!u) continue;
    const arr = byRoom.get(r.roomId) ?? [];
    arr.push({ handle: u.handle, name: u.name, avatarHue: u.avatarHue, avatarUrl: u.avatarUrl, micOn: r.micOn, speaking: r.speaking, isMe: r.userId === userId });
    byRoom.set(r.roomId, arr);
  }
  return [...byRoom.entries()].map(([roomId, members]) => ({ roomId, members }));
}
