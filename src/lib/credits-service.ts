import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

const MAX_TOPUP = 100_000;

const today = () => new Date().toISOString();

export async function getBalance(): Promise<number> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
  return u.credits;
}

/**
 * 充值点数。**演示占位**：真实支付网关（微信/支付宝/卡）待接入——
 * 此处假定支付已成功，直接入账并记一笔流水。接真实支付时，把入账逻辑
 * 移到支付回调里即可，前端流程不变。
 */
export async function topUp(credits: number, method = "demo"): Promise<{ balance: number }> {
  const userId = await getSessionUserId();
  const amt = Math.max(1, Math.min(MAX_TOPUP, Math.round(credits)));
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amt } },
      select: { credits: true },
    });
    await tx.creditTransaction.create({
      data: { userId, kind: "topup", amount: amt, balanceAfter: u.credits, method, note: "充值", createdAt: today() },
    });
    return { balance: u.credits };
  });
}

/** 点数兑换 Gateway token 的比例（1 点数 = N token）。改这里即可调价。 */
export const TOKENS_PER_CREDIT = 1000;

/** 当前用户的 Gateway token 余额 */
export async function getMyTokens(): Promise<number> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { gatewayTokens: true } });
  return u.gatewayTokens;
}

/**
 * 用点数兑换 Gateway token：扣点数、加 token、记一笔流水。
 * token 用于经平台 key 调模型的应用（如 multillm 未配自有 key 时），按用量扣减。
 */
export async function exchangeTokens(creditsToSpend: number): Promise<{ credits: number; gatewayTokens: number; added: number }> {
  const userId = await getSessionUserId();
  const spend = Math.max(1, Math.min(MAX_TOPUP, Math.round(creditsToSpend)));
  const added = spend * TOKENS_PER_CREDIT;
  return prisma.$transaction(async (tx) => {
    const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
    if (me.credits < spend) throw new Error(`点数不足（需 ${spend}，余 ${me.credits}）`);
    const u = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: spend }, gatewayTokens: { increment: added } },
      select: { credits: true, gatewayTokens: true },
    });
    await tx.creditTransaction.create({
      data: { userId, kind: "token_exchange", amount: -spend, balanceAfter: u.credits, note: `兑换 ${added.toLocaleString("zh-CN")} token`, createdAt: today() },
    });
    return { credits: u.credits, gatewayTokens: u.gatewayTokens, added };
  });
}

export async function getTransactions(limit = 50) {
  const userId = await getSessionUserId();
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
