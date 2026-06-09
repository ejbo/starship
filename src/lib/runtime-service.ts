import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { getSessionUserId } from "@/lib/session";
import { capabilityProvider, providerMeta } from "@/lib/providers";

export interface SdkIdentity {
  name: string;
  handle: string;
  avatarHue: number;
}

/** SDK identity.get：仅暴露公开身份，绝不含邮箱/密钥 */
export async function sdkIdentity(): Promise<SdkIdentity> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, handle: true, avatarHue: true },
  });
  return u;
}

export interface ChatResult {
  reply: string;
  provider: string;
  via: string;
}

/**
 * SDK ai.chat：经平台 Gateway 代理。
 * 关键安全属性：在服务端解密用户的 API Key 用于调用，结果回传应用，
 * 但应用（iframe）全程接触不到明文 Key。Phase 1 返回演示响应并记录用量。
 */
export async function sdkChat(slug: string, prompt: string): Promise<ChatResult> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, capabilities: true },
  });
  if (!product) throw new Error("应用不存在");

  // 取该应用声明的首个具体 LLM provider
  const provider =
    product.capabilities.map(capabilityProvider).find((p): p is string => Boolean(p)) ?? "anthropic";

  const cred = await prisma.apiCredential.findFirst({
    where: { userId, provider },
    select: { ciphertext: true, last4: true },
  });
  if (!cred) {
    return {
      reply: `你尚未配置 ${providerMeta(provider).name}。请到「API 配置中心」添加密钥后再试。`,
      provider,
      via: "未配置",
    };
  }

  // 解密只发生在服务端这一瞬间，用于真实调用（此处为演示，不外发网络）
  const key = decryptSecret(cred.ciphertext);
  void key; // 真实实现：以 key 调用 provider SDK；演示环境不外发

  // 记录用量（与用量看板打通）
  const tokensIn = Math.ceil(prompt.length / 2);
  const tokensOut = 64;
  await prisma.usageRecord.create({
    data: {
      userId,
      productSlug: slug,
      provider,
      model: `${provider}-demo`,
      tokensIn,
      tokensOut,
      costCents: 1,
      day: new Date().toISOString().slice(0, 10),
    },
  });

  return {
    reply: `「${prompt}」收到。这是经星港 Gateway 用你的 ${providerMeta(provider).name} 密钥（····${cred.last4}）代理返回的演示响应——应用本身从未接触你的明文 Key。`,
    provider,
    via: `${providerMeta(provider).name} · ····${cred.last4}`,
  };
}

export async function sdkStorageGet(slug: string, key: string): Promise<string | null> {
  const userId = await getSessionUserId();
  const row = await prisma.appStorage.findUnique({
    where: { userId_productSlug_key: { userId, productSlug: slug, key } },
    select: { value: true },
  });
  return row?.value ?? null;
}

export async function sdkStorageSet(slug: string, key: string, value: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.appStorage.upsert({
    where: { userId_productSlug_key: { userId, productSlug: slug, key } },
    update: { value },
    create: { userId, productSlug: slug, key, value },
  });
}
