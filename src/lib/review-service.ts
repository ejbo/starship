import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

/** 标记评测「有价值」（每人每条仅一次）。返回最新有价值数。 */
export async function markHelpful(reviewId: string): Promise<{ helpful: number; voted: boolean }> {
  const userId = await getSessionUserId();
  try {
    await prisma.reviewVote.create({ data: { reviewId, userId } });
  } catch {
    // 已投过：返回当前数
    const r = await prisma.review.findUnique({ where: { id: reviewId }, select: { helpful: true } });
    return { helpful: r?.helpful ?? 0, voted: true };
  }
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { helpful: { increment: 1 } },
    select: { helpful: true },
  });
  return { helpful: updated.helpful, voted: true };
}

/**
 * 提交评测：同一用户对同一产品仅一条（重复则更新）。
 * 评测者去规范化存储（authorName/avatarHue），并维护一个隐藏的 authorUserId 防重。
 * 写入后重算 ratingScore / ratingCount。
 */
export async function submitReview(slug: string, score: number, body: string): Promise<void> {
  const userId = await getSessionUserId();
  const clean = body.trim();
  const s = Math.min(5, Math.max(1, Math.round(score)));
  if (!clean) throw new Error("评测内容不能为空");

  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) throw new Error("产品不存在");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, avatarHue: true },
  });

  // 该用户在此产品的使用时长（评测可信度展示）
  const entry = await prisma.libraryEntry.findUnique({
    where: { userId_productId: { userId, productId: product.id } },
    select: { usageHours: true },
  });

  await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findFirst({
      where: { productId: product.id, authorUserId: userId },
      select: { id: true },
    });
    if (existing) {
      await tx.review.update({
        where: { id: existing.id },
        data: { score: s, body: clean, date: today() },
      });
    } else {
      await tx.review.create({
        data: {
          productId: product.id,
          authorUserId: userId,
          authorName: user.name,
          avatarHue: user.avatarHue,
          isAgent: false,
          score: s,
          usageHours: entry?.usageHours ?? 0,
          helpful: 0,
          body: clean,
          date: today(),
        },
      });
    }

    // 展示聚合 = base 社会证明 与平台内真实评测（authorUserId 非空）的混合
    const base = await tx.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { baseRatingScore: true, baseRatingCount: true },
    });
    const userAgg = await tx.review.aggregate({
      where: { productId: product.id, authorUserId: { not: null } },
      _sum: { score: true },
      _count: { _all: true },
    });
    const count = base.baseRatingCount + userAgg._count._all;
    const scoreSum = base.baseRatingScore * base.baseRatingCount + (userAgg._sum.score ?? 0);
    await tx.product.update({
      where: { id: product.id },
      data: {
        ratingScore: count > 0 ? Number((scoreSum / count).toFixed(2)) : base.baseRatingScore,
        ratingCount: count,
      },
    });
  });
}

/** 当前用户对该产品的已有评测（用于表单回填） */
export async function getMyReview(slug: string) {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return null;
  return prisma.review.findFirst({
    where: { productId: product.id, authorUserId: userId },
    select: { score: true, body: true },
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
