"use server";

import { revalidatePath } from "next/cache";
import { addCredential, deleteCredential } from "@/lib/gateway-service";
import { GatewayError, runGatewayChat } from "@/lib/gateway-core";
import { getSessionUserId } from "@/lib/session";

export interface PlaygroundResult {
  ok: boolean;
  text?: string;
  via?: string;
  error?: string;
  code?: string;
}

export async function playgroundChatAction(provider: string, model: string, prompt: string): Promise<PlaygroundResult> {
  if (!prompt.trim()) return { ok: false, error: "请输入内容" };
  const userId = await getSessionUserId();
  try {
    const res = await runGatewayChat({
      userId,
      provider,
      model: model.trim() || undefined,
      prompt,
      productSlug: "gateway-playground",
    });
    return {
      ok: true,
      text: res.text,
      via: `${res.model} · ····${res.last4} · in ${res.tokensIn} / out ${res.tokensOut} tokens`,
    };
  } catch (e) {
    if (e instanceof GatewayError) return { ok: false, error: e.message, code: e.code };
    return { ok: false, error: e instanceof Error ? e.message : "调用失败" };
  }
}

export async function addCredentialAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const label = String(formData.get("label") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const limitRaw = String(formData.get("dailyTokenLimit") ?? "").trim();
  const dailyTokenLimit = limitRaw ? Math.max(0, Number(limitRaw)) || null : null;

  await addCredential({ provider, label, secret, dailyTokenLimit });
  revalidatePath("/settings/gateway");
}

export async function deleteCredentialAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteCredential(id);
    revalidatePath("/settings/gateway");
  }
}
