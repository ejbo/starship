import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { callProvider, defaultModel } from "@/lib/provider-adapters";

export type GatewayErrorCode = "no_credential" | "limit_exceeded" | "upstream";

export class GatewayError extends Error {
  code: GatewayErrorCode;
  constructor(code: GatewayErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface GatewayChatInput {
  userId: string;
  provider: string;
  model?: string;
  prompt: string;
  /** 计入哪个应用的用量 */
  productSlug: string;
}

export interface GatewayChatResult {
  text: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  last4: string;
}

/** 粗略成本（分/1k tokens），仅用于看板展示 */
const PRICE_PER_1K: Record<string, { in: number; out: number }> = {
  anthropic: { in: 0.08, out: 0.4 },
  openai: { in: 0.015, out: 0.06 },
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 今日该用户在该 provider 的总 token 消耗（用于日限额） */
async function todayTokens(userId: string, provider: string): Promise<number> {
  const agg = await prisma.usageRecord.aggregate({
    where: { userId, provider, day: today() },
    _sum: { tokensIn: true, tokensOut: true },
  });
  return (agg._sum.tokensIn ?? 0) + (agg._sum.tokensOut ?? 0);
}

/**
 * 网关核心：解密密钥 → 检查日限额 → 真实调用 provider → 记真实用量 → 返回。
 * 沙箱 SDK 与配置中心 Playground 共用此函数。
 */
export async function runGatewayChat(input: GatewayChatInput): Promise<GatewayChatResult> {
  const { userId, provider, prompt, productSlug } = input;

  const cred = await prisma.apiCredential.findFirst({
    where: { userId, provider },
    select: { ciphertext: true, last4: true, dailyTokenLimit: true },
  });
  if (!cred) throw new GatewayError("no_credential", `尚未配置 ${provider} 密钥`);

  // 日限额强制
  if (cred.dailyTokenLimit != null) {
    const used = await todayTokens(userId, provider);
    if (used >= cred.dailyTokenLimit) {
      throw new GatewayError(
        "limit_exceeded",
        `已达 ${provider} 今日额度上限（${cred.dailyTokenLimit.toLocaleString("zh-CN")} tokens）`,
      );
    }
  }

  const model = input.model?.trim() || defaultModel[provider] || "default";
  const key = decryptSecret(cred.ciphertext);

  let result;
  try {
    result = await callProvider(provider, key, model, prompt);
  } catch (e) {
    throw new GatewayError("upstream", e instanceof Error ? e.message : "上游调用失败");
  }

  // 记真实用量
  const price = PRICE_PER_1K[provider] ?? { in: 0, out: 0 };
  const costCents = Math.round((result.tokensIn / 1000) * price.in + (result.tokensOut / 1000) * price.out);
  await prisma.usageRecord.create({
    data: {
      userId,
      productSlug,
      provider,
      model: result.model,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      costCents,
      day: today(),
    },
  });

  return {
    text: result.text,
    provider,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    last4: cred.last4,
  };
}
