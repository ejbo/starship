"use server";

import {
  acceptFriendRequest,
  getFriendsWithPresence,
  getIncomingRequests,
  removeFriend,
  sendFriendRequest,
  setFriendRemark,
  type FriendRequestView,
} from "@/lib/friends-service";
import {
  getConversation,
  getIncomingSince,
  sendMessage,
  type ChatMessage,
  type IncomingMessage,
} from "@/lib/message-service";
import type { Friend } from "@/lib/types";

export async function loadConversationAction(handle: string): Promise<ChatMessage[]> {
  return getConversation(handle);
}

export async function sendMessageAction(handle: string, body: string): Promise<ChatMessage> {
  return sendMessage(handle, body);
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

export interface PollResult {
  now: string;
  messages: IncomingMessage[];
  friends: Friend[];
  requests: FriendRequestView[];
}

/** 轮询：自 since 起的新消息 + 最新好友/请求/在线状态 */
export async function pollUpdatesAction(since: string): Promise<PollResult> {
  const now = new Date().toISOString();
  const [messages, friends, requests] = await Promise.all([
    getIncomingSince(since),
    getFriendsWithPresence(),
    getIncomingRequests(),
  ]);
  return { now, messages, friends, requests };
}
