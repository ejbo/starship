"use server";

import {
  sdkChat,
  sdkIdentity,
  sdkStorageGet,
  sdkStorageSet,
  type ChatResult,
  type SdkIdentity,
} from "@/lib/runtime-service";

export async function identityAction(): Promise<SdkIdentity> {
  return sdkIdentity();
}

export async function chatAction(slug: string, prompt: string): Promise<ChatResult> {
  return sdkChat(slug, prompt);
}

export async function storageGetAction(slug: string, key: string): Promise<string | null> {
  return sdkStorageGet(slug, key);
}

export async function storageSetAction(slug: string, key: string, value: string): Promise<void> {
  return sdkStorageSet(slug, key, value);
}
