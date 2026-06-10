import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { capabilityProvider, providerMeta } from "@/lib/providers";
import { unlockAchievement } from "@/lib/achievement-service";
import { GatewayError, runGatewayChat } from "@/lib/gateway-core";

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
 * SDK ai.chat：经平台 Gateway 真实代理（gateway-core）。
 * 关键安全属性：服务端解密用户密钥用于调用，结果回传应用，应用全程接触不到明文 Key。
 * 演示密钥/网络失败优雅降级为提示文案，不抛给应用。
 */
export async function sdkChat(slug: string, prompt: string): Promise<ChatResult> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { capabilities: true },
  });
  if (!product) throw new Error("应用不存在");

  // 取该应用声明的首个具体 LLM provider
  const provider =
    product.capabilities.map(capabilityProvider).find((p): p is string => Boolean(p)) ?? "anthropic";

  try {
    const res = await runGatewayChat({ userId, provider, prompt, productSlug: slug });
    return {
      reply: res.text,
      provider,
      via: `${providerMeta(provider).name} · ${res.model} · ····${res.last4}（in ${res.tokensIn}/out ${res.tokensOut} tokens）`,
    };
  } catch (e) {
    if (e instanceof GatewayError) {
      const hint =
        e.code === "no_credential"
          ? "请到「API 配置中心」添加密钥后再试。"
          : e.code === "limit_exceeded"
            ? "请调高日限额或明日再试。"
            : "（演示密钥或网络不可用时会出现此提示；填入真实密钥即可获得真实回复。）";
      return { reply: `${e.message}。${hint}`, provider, via: "Gateway 未出账" };
    }
    throw e;
  }
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

/** SDK achievements.unlock：与开放 API 共用同一成就后端 */
export async function sdkUnlock(slug: string, key: string): Promise<{ unlocked: boolean; name: string }> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) throw new Error("应用不存在");
  const res = await unlockAchievement(product.id, userId, key);
  return { unlocked: res.unlocked, name: res.name };
}
