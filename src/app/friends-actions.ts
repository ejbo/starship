"use server";

import {
  acceptFriendRequest,
  getFriendsWithPresence,
  getIncomingRequests,
  getMyPresence,
  getRecentFriends,
  ignoreFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsersToAdd,
  sendFriendRequest,
  setFriendRemark,
  touchPresence,
  type DerivedPresence,
  type FriendRequestView,
  type UserSearchResult,
} from "@/lib/friends-service";
import {
  createChannel,
  createGroup,
  deleteChannel,
  deleteGroup,
  getChannelPage,
  getGroupIncomingSince,
  getGroupMutationsSince,
  getMyGroups,
  inviteToGroup,
  leaveGroup,
  removeMember,
  renameGroup,
  reorderChannels,
  sendGroupMessage,
  updateChannel,
  updateGroupProfile,
  type GroupChannel,
  type GroupChannelPage,
  type GroupChatMessage,
  type GroupSummary,
  type IncomingGroupMessage,
} from "@/lib/group-service";
import {
  getConversationPage,
  getDmMutationsSince,
  getIncomingSince,
  getUnreadCounts,
  sendMessage,
  type ChatMessage,
  type ConversationPage,
  type IncomingMessage,
  type SendInput,
} from "@/lib/message-service";
import { deleteMessage, editMessage, toggleReaction, type Scope } from "@/lib/chat-interactions";
import { getSignals, reportRead, reportTyping, type ReadView, type TypingView } from "@/lib/signal-service";
import { getVoiceRooms, heartbeatVoiceRooms, joinVoiceRoom, leaveVoiceRoom, setMic, type VoiceRoomSnapshot } from "@/lib/voice-room-service";
import type { MessageMutation } from "@/components/social/presence";
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

export async function rejectRequestAction(edgeId: string): Promise<void> {
  await rejectFriendRequest(edgeId);
}

export async function ignoreRequestAction(edgeId: string): Promise<void> {
  await ignoreFriendRequest(edgeId);
}

/** 处理好友申请：同意 / 拒绝 / 忽略 */
export async function respondRequestAction(edgeId: string, decision: "accept" | "reject" | "ignore"): Promise<void> {
  if (decision === "accept") await acceptFriendRequest(edgeId);
  else if (decision === "reject") await rejectFriendRequest(edgeId);
  else await ignoreFriendRequest(edgeId);
}

/** 搜索可添加的用户（按好友码或昵称/用户名） */
export async function searchUsersAction(query: string): Promise<UserSearchResult[]> {
  return searchUsersToAdd(query);
}

/** 最近添加的好友（加好友面板展示） */
export async function recentFriendsAction(): Promise<Friend[]> {
  return getRecentFriends();
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

export async function updateChannelAction(channelId: string, patch: { name?: string; topic?: string; slowmodeSec?: number; agentScope?: string[] }): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateChannel(channelId, patch);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteChannelAction(channelId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteChannel(channelId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}

export async function reorderChannelsAction(groupId: string, orderedIds: string[]): Promise<void> {
  await reorderChannels(groupId, orderedIds);
}

export async function updateGroupProfileAction(groupId: string, patch: { name?: string; description?: string; iconUrl?: string | null }): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateGroupProfile(groupId, patch);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function removeMemberAction(groupId: string, handle: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await removeMember(groupId, handle);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "移除失败" };
  }
}

export async function deleteGroupAction(groupId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteGroup(groupId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "解散失败" };
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
  mutations: { dm: MessageMutation[]; group: MessageMutation[] };
  typing: TypingView[];
  reads: ReadView[];
  voiceRooms: VoiceRoomSnapshot[];
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
 * 轮询：(since, now] 的新消息 + 已有消息变更(编辑/删除/反应)增量 + typing/已读 + 语音房间在场
 * + 好友/群组/请求/在线状态。openConvKeys = 客户端当前打开的会话(handle / c:<channelId>)，
 * 用于把 typing/已读/语音房间查询收窄到打开的会话，避免轮询风暴。voiceRoomIds = 当前可见的语音频道。
 */
export async function pollUpdatesAction(since: string, openConvKeys: string[] = [], voiceRoomIds: string[] = []): Promise<PollResult> {
  const now = new Date().toISOString();
  await Promise.all([touchPresence(), heartbeatVoiceRooms()]);
  const [messages, groupMessages, dmMut, groupMut, signals, voiceRooms, friends, groups, requests, myPresence] = await Promise.all([
    getIncomingSince(since, now),
    getGroupIncomingSince(since, now),
    getDmMutationsSince(since, now),
    getGroupMutationsSince(since, now),
    getSignals(openConvKeys),
    getVoiceRooms(voiceRoomIds),
    getFriendsWithPresence(),
    getMyGroups(),
    getIncomingRequests(),
    getMyPresence(),
  ]);
  return {
    now,
    messages,
    groupMessages,
    mutations: { dm: dmMut, group: groupMut },
    typing: signals.typing,
    reads: signals.reads,
    voiceRooms,
    friends,
    groups,
    requests,
    myPresence,
  };
}

// —— 消息交互 ——

export async function toggleReactionAction(scope: Scope, messageId: string, emoji: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await toggleReaction(scope, messageId, emoji);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失败" };
  }
}

export async function editMessageAction(scope: Scope, messageId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await editMessage(scope, messageId, body);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "编辑失败" };
  }
}

export async function deleteMessageAction(scope: Scope, messageId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteMessage(scope, messageId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}

// —— typing / 已读 ——

export async function reportTypingAction(convKey: string): Promise<void> {
  await reportTyping(convKey);
}
export async function reportReadAction(convKey: string, lastAt: string): Promise<void> {
  await reportRead(convKey, lastAt);
}

// —— 语音房间 ——

export async function joinVoiceRoomAction(roomId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await joinVoiceRoom(roomId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加入失败" };
  }
}
export async function leaveVoiceRoomAction(roomId: string): Promise<void> {
  await leaveVoiceRoom(roomId);
}
export async function setMicAction(roomId: string, micOn: boolean): Promise<void> {
  await setMic(roomId, micOn);
}
