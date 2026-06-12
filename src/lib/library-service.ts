import "server-only";
import { prisma } from "@/lib/db";
import { effectivePrice } from "@/lib/price";
import { getSessionUserId } from "@/lib/session";

/** 开发者收益分成比例（Steam 式 70/30，开发者得 70%） */
const DEV_SHARE = 0.7;

/** 当前用户是否已获取该产品 */
export async function isInLibrary(slug: string): Promise<boolean> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return false;
  const entry = await prisma.libraryEntry.findUnique({
    where: { userId_productId: { userId, productId: product.id } },
    select: { id: true },
  });
  return Boolean(entry);
}

/**
 * 获取/购买（入库）：幂等。
 * - 免费产品：直接入库；
 * - 付费产品：扣点数（不足则抛错）。这是未来支付系统的占位——支付即充值点数。
 */
export async function acquire(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, name: true, priceCredits: true, discountPct: true, ownerUserId: true },
  });
  if (!product) throw new Error("产品不存在");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.libraryEntry.findUnique({
      where: { userId_productId: { userId, productId: product.id } },
      select: { id: true },
    });
    if (existing) return;

    // 付费：按折后价扣点数 + 记一笔购买流水
    const price = product.priceCredits == null ? 0 : effectivePrice(product.priceCredits, product.discountPct ?? 0);
    if (price > 0) {
      const me = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
      if (me.credits < price) throw new Error(`点数不足（需 ${price}，余 ${me.credits}）`);
      const after = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: price } },
        select: { credits: true },
      });
      await tx.creditTransaction.create({
        data: { userId, kind: "purchase", amount: -price, balanceAfter: after.credits, productSlug: slug, note: "购买产品", createdAt: new Date().toISOString() },
      });

      // 收益分成：开发者得折后价的 70%（平台留 30%）。买自己应用不分成。
      const share = Math.floor(price * DEV_SHARE);
      if (product.ownerUserId && product.ownerUserId !== userId && share > 0) {
        const ownerAfter = await tx.user.update({
          where: { id: product.ownerUserId },
          data: { credits: { increment: share } },
          select: { credits: true },
        });
        await tx.creditTransaction.create({
          data: { userId: product.ownerUserId, kind: "earning", amount: share, balanceAfter: ownerAfter.credits, productSlug: slug, note: "应用销售分成", createdAt: new Date().toISOString() },
        });
        await tx.notification.create({
          data: { userId: product.ownerUserId, kind: "earning", title: `应用售出：${product.name}`, body: `收益 +${share} 点数`, href: "/wallet", read: false, createdAt: new Date().toISOString() },
        });
      }
    }

    await tx.libraryEntry.create({
      data: { userId, productId: product.id, acquiredAt: today(), lastUsedAt: today(), usageHours: 0 },
    });
    await tx.product.update({ where: { id: product.id }, data: { acquisitions: { increment: 1 } } });
  });
}

/** 当前用户对某产品的库条目（使用时长/最近使用/获取时间）——库详情页用 */
export async function getMyLibraryStat(
  productId: string,
): Promise<{ usageMinutes: number; usageHours: number; lastUsedAt: string | null; acquiredAt: string } | null> {
  const userId = await getSessionUserId();
  const e = await prisma.libraryEntry.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { usageMinutes: true, usageHours: true, lastUsedAt: true, acquiredAt: true },
  });
  return e ?? null;
}

/** 当前用户点数余额 */
export async function getMyCredits(): Promise<number> {
  const userId = await getSessionUserId();
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { credits: true } });
  return u.credits;
}

/** 移出库：acquisitions--，付费产品退还点数（原型行为） */
export async function removeFromLibrary(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true, priceCredits: true, discountPct: true, ownerUserId: true } });
  if (!product) return;

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.libraryEntry.deleteMany({ where: { userId, productId: product.id } });
    if (deleted.count > 0) {
      await tx.product.update({ where: { id: product.id }, data: { acquisitions: { decrement: 1 } } });
      const price = product.priceCredits == null ? 0 : effectivePrice(product.priceCredits, product.discountPct ?? 0);
      if (price > 0) {
        const after = await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: price } },
          select: { credits: true },
        });
        await tx.creditTransaction.create({
          data: { userId, kind: "refund", amount: price, balanceAfter: after.credits, productSlug: slug, note: "移出库退款", createdAt: new Date().toISOString() },
        });

        // 回收开发者分成
        const share = Math.floor(price * DEV_SHARE);
        if (product.ownerUserId && product.ownerUserId !== userId && share > 0) {
          const ownerAfter = await tx.user.update({
            where: { id: product.ownerUserId },
            data: { credits: { decrement: share } },
            select: { credits: true },
          });
          await tx.creditTransaction.create({
            data: { userId: product.ownerUserId, kind: "earning", amount: -share, balanceAfter: ownerAfter.credits, productSlug: slug, note: "退款回收分成", createdAt: new Date().toISOString() },
          });
        }
      }
    }
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
