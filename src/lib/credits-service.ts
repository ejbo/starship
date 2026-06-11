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

export async function getTransactions(limit = 50) {
  const userId = await getSessionUserId();
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
