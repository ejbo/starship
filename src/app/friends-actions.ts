"use server";

import {
  acceptFriendRequest,
  getFriendsWithPresence,
  getIncomingRequests,
  getMyPresence,
  removeFriend,
  sendFriendRequest,
  setFriendRemark,
  touchPresence,
  type DerivedPresence,
  type FriendRequestView,
} from "@/lib/friends-service";
import {
  createChannel,
  createGroup,
  getChannelPage,
  getGroupIncomingSince,
  getMyGroups,
  inviteToGroup,
  leaveGroup,
  renameGroup,
  sendGroupMessage,
  type GroupChannel,
  type GroupChannelPage,
  type GroupChatMessage,
  type GroupSummary,
  type IncomingGroupMessage,
} from "@/lib/group-service";
import {
  getConversationPage,
  getIncomingSince,
  getUnreadCounts,
  sendMessage,
  type ChatMessage,
  type ConversationPage,
  type IncomingMessage,
  type SendInput,
} from "@/lib/message-service";
import type { Friend } from "@/lib/types";

/** 加载一页会话；beforeIso 为空取最新页，否则取更老的历史页 */
export async function loadConversationAction(handle: string, beforeIso?: string): Promise<ConversationPage> {
  return getConversationPage(handle, beforeIso);
}

export async function sendMessageAction(handle: string, body: string, input?: SendInput): Promise<ChatMessage> {
  return sendMessage(handle, body, input);
}

export async function addFriendAction(handle: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendFriendRequest(handle);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function acceptRequestAction(edgeId: string): Promise<void> {
  await acceptFriendRequest(edgeId);
}

export async function removeFriendAction(handle: string): Promise<void> {
  await removeFriend(handle);
}

export async function setRemarkAction(handle: string, remark: string): Promise<void> {
  await setFriendRemark(handle, remark);
}

/** 客户端拉取最新好友 + 请求 */
export async function refreshSocialAction(): Promise<{ friends: Friend[]; requests: FriendRequestView[] }> {
  const [friends, requests] = await Promise.all([getFriendsWithPresence(), getIncomingRequests()]);
  return { friends, requests };
}

// —— 群组聊天 ——

export async function createGroupAction(handles: string[], name?: string): Promise<{ ok: boolean; groupId?: string; error?: string }> {
  try {
    const groupId = await createGroup(handles, name);
    return { ok: true, groupId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function inviteToGroupAction(groupId: string, handles: string[]): Promise<void> {
  await inviteToGroup(groupId, handles);
}

export async function leaveGroupAction(groupId: string): Promise<void> {
  await leaveGroup(groupId);
}

export async function renameGroupAction(groupId: string, name: string): Promise<void> {
  await renameGroup(groupId, name);
}

export async function createChannelAction(groupId: string, name: string, kind: "text" | "voice"): Promise<{ ok: boolean; channel?: GroupChannel; error?: string }> {
  try {
    const channel = await createChannel(groupId, name, kind);
    return { ok: true, channel };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function loadChannelAction(channelId: string, beforeIso?: string): Promise<GroupChannelPage> {
  return getChannelPage(channelId, beforeIso);
}

export async function sendGroupMessageAction(channelId: string, body: string, input?: SendInput): Promise<GroupChatMessage> {
  return sendGroupMessage(channelId, body, input);
}

export async function refreshGroupsAction(): Promise<GroupSummary[]> {
  return getMyGroups();
}

export interface PollResult {
  now: string;
  messages: IncomingMessage[];
  groupMessages: IncomingGroupMessage[];
  friends: Friend[];
  groups: GroupSummary[];
  requests: FriendRequestView[];
  myPresence: DerivedPresence;
}

/** 私聊未读角标的持久化初值（挂载时拉一次） */
export async function loadUnreadCountsAction(): Promise<Record<string, number>> {
  return getUnreadCounts();
}

/**
 * 轮询：(since, now] 的新私聊/群聊消息 + 最新好友/群组/请求/在线状态 + 本人状态。
 * 顺带刷新本人 lastSeenAt（SPA 停留超 5 分钟不被误判离线）。
 * 上界与游标推进值一致，避免查询期间落库的消息下一轮重复投递。
 */
export async function pollUpdatesAction(since: string): Promise<PollResult> {
  const now = new Date().toISOString();
  await touchPresence();
  const [messages, groupMessages, friends, groups, requests, myPresence] = await Promise.all([
    getIncomingSince(since, now),
    getGroupIncomingSince(since, now),
    getFriendsWithPresence(),
    getMyGroups(),
    getIncomingRequests(),
    getMyPresence(),
  ]);
  return { now, messages, groupMessages, friends, groups, requests, myPresence };
}
