import "server-only";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { callProvider, defaultModel } from "@/lib/provider-adapters";

export type GatewayErrorCode = "no_credential" | "limit_exceeded" | "upstream";

/** 平台自有上游 key（运营方在服务器 env 配置）：用户没配自有 key 时由平台出账、扣 token */
const PLATFORM_KEY_ENV: Record<string, string> = {
  anthropic: "STARPORT_GW_ANTHROPIC_KEY",
  openai: "STARPORT_GW_OPENAI_KEY",
  google: "STARPORT_GW_GOOGLE_KEY",
  xai: "STARPORT_GW_XAI_KEY",
  deepseek: "STARPORT_GW_DEEPSEEK_KEY",
  zhipu: "STARPORT_GW_ZHIPU_KEY",
  qwen: "STARPORT_GW_QWEN_KEY",
};
function platformKeyFor(provider: string): string | null {
  const v = process.env[PLATFORM_KEY_ENV[provider] ?? ""];
  return v && v.trim() ? v.trim() : null;
}

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
  google: { in: 0.0125, out: 0.05 },
  xai: { in: 0.03, out: 0.15 },
  deepseek: { in: 0.004, out: 0.011 },
  zhipu: { in: 0.005, out: 0.02 },
  qwen: { in: 0.006, out: 0.018 },
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

  // 选路：优先用户自有 key（免费、按日限额）；没有则用平台 key + 扣预付 token（运营方卖 token）
  let key: string;
  let last4: string;
  let usePlatform = false;

  if (cred) {
    if (cred.dailyTokenLimit != null) {
      const used = await todayTokens(userId, provider);
      if (used >= cred.dailyTokenLimit) {
        throw new GatewayError(
          "limit_exceeded",
          `已达 ${provider} 今日额度上限（${cred.dailyTokenLimit.toLocaleString("zh-CN")} tokens）`,
        );
      }
    }
    key = decryptSecret(cred.ciphertext);
    last4 = cred.last4;
  } else {
    const pk = platformKeyFor(provider);
    const me = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { gatewayTokens: true } });
    if (!pk) throw new GatewayError("no_credential", `尚未配置 ${provider} 密钥`);
    if (me.gatewayTokens <= 0) {
      throw new GatewayError("limit_exceeded", `token 余额不足，请在钱包用点数兑换 token，或配置自有 ${provider} 密钥`);
    }
    key = pk;
    last4 = "平台";
    usePlatform = true;
  }

  const model = input.model?.trim() || defaultModel[provider] || "default";

  let result;
  try {
    result = await callProvider(provider, key, model, prompt);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "上游调用失败";
    // 上游说该模型不存在/无权限 → 退回该 provider 实测可用的默认模型，保证有回复（不让整条对话直接失败）
    const fb = defaultModel[provider];
    const modelMissing = /not[\s_-]?found|does not exist|do not have access|no such model|unsupported.*model|invalid.*model|未找到|不存在|无权限/i.test(msg);
    if (fb && model !== fb && modelMissing) {
      try {
        result = await callProvider(provider, key, fb, prompt);
      } catch (e2) {
        throw new GatewayError("upstream", e2 instanceof Error ? e2.message : "上游调用失败");
      }
    } else {
      throw new GatewayError("upstream", msg);
    }
  }

  // 记真实用量
  const price = PRICE_PER_1K[provider] ?? { in: 0, out: 0 };
  const costCents = Math.round((result.tokensIn / 1000) * price.in + (result.tokensOut / 1000) * price.out);
  await prisma.usageRecord.create({
    data: { userId, productSlug, provider, model: result.model, tokensIn: result.tokensIn, tokensOut: result.tokensOut, costCents, day: today() },
  });

  // 平台出账：按本次用量扣预付 token。条件原子更新避免并发把余额扣成负数：
  // 先尝试「余额≥spend 时减 spend」；不足则置 0（两步都是幂等/原子，跨请求并发安全）。
  if (usePlatform) {
    const spend = result.tokensIn + result.tokensOut;
    if (spend > 0) {
      const upd = await prisma.user.updateMany({
        where: { id: userId, gatewayTokens: { gte: spend } },
        data: { gatewayTokens: { decrement: spend } },
      });
      if (upd.count === 0) {
        await prisma.user.update({ where: { id: userId }, data: { gatewayTokens: 0 } });
      }
    }
  }

  return {
    text: result.text,
    provider,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    last4,
  };
}
