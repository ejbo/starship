"use server";

import { revalidatePath } from "next/cache";
import {
  acceptFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends-service";
import { getConversation, sendMessage, type ChatMessage } from "@/lib/message-service";

export async function loadConversationAction(handle: string): Promise<ChatMessage[]> {
  return getConversation(handle);
}

export async function sendMessageAction(handle: string, body: string): Promise<ChatMessage> {
  return sendMessage(handle, body);
}

export async function addFriendAction(handle: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await sendFriendRequest(handle);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "添加失败" };
  }
}

export async function acceptRequestAction(edgeId: string): Promise<void> {
  await acceptFriendRequest(edgeId);
  revalidatePath("/");
}

export async function removeFriendAction(handle: string): Promise<void> {
  await removeFriend(handle);
  revalidatePath("/");
}
