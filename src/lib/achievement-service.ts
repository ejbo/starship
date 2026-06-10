import "server-only";
import { prisma } from "@/lib/db";

export interface AchievementView {
  key: string;
  name: string;
  description: string;
  icon: string;
  hidden: boolean;
  unlocked: boolean;
  unlockedAt?: string;
  /** 全站解锁率 0-100 */
  rarity: number;
}

/** 某用户在某应用的成就（schema + 解锁态 + 稀有度） */
export async function getAchievementsForUser(productId: string, userId: string | null): Promise<AchievementView[]> {
  const achievements = await prisma.achievement.findMany({
    where: { productId },
    orderBy: { sort: "asc" },
    include: { _count: { select: { unlocks: true } } },
  });
  if (achievements.length === 0) return [];

  // 拥有该应用的人数（稀有度分母），至少 1 避免除零
  const owners = Math.max(1, await prisma.libraryEntry.count({ where: { productId } }));

  const unlockedIds = userId
    ? new Set(
        (
          await prisma.achievementUnlock.findMany({
            where: { userId, achievement: { productId } },
            select: { achievementId: true, at: true },
          })
        ).map((u) => u.achievementId),
      )
    : new Set<string>();

  const unlockedAtById = userId
    ? new Map(
        (
          await prisma.achievementUnlock.findMany({
            where: { userId, achievement: { productId } },
            select: { achievementId: true, at: true },
          })
        ).map((u) => [u.achievementId, u.at]),
      )
    : new Map<string, string>();

  return achievements.map((a) => ({
    key: a.key,
    name: a.name,
    description: a.description,
    icon: a.icon,
    hidden: a.hidden,
    unlocked: unlockedIds.has(a.id),
    unlockedAt: unlockedAtById.get(a.id),
    rarity: Math.round((a._count.unlocks / owners) * 100),
  }));
}

export interface UnlockResult {
  unlocked: boolean;
  alreadyOwned: boolean;
  name: string;
}

/** 解锁成就（幂等）。返回是否新解锁。 */
export async function unlockAchievement(productId: string, userId: string, key: string): Promise<UnlockResult> {
  const achievement = await prisma.achievement.findUnique({
    where: { productId_key: { productId, key } },
    select: { id: true, name: true },
  });
  if (!achievement) throw new Error(`成就 ${key} 不存在`);

  const existing = await prisma.achievementUnlock.findUnique({
    where: { achievementId_userId: { achievementId: achievement.id, userId } },
    select: { id: true },
  });
  if (existing) return { unlocked: false, alreadyOwned: true, name: achievement.name };

  await prisma.achievementUnlock.create({
    data: { achievementId: achievement.id, userId, at: new Date().toISOString() },
  });
  return { unlocked: true, alreadyOwned: false, name: achievement.name };
}

export interface RecentUnlock {
  name: string;
  icon: string;
  productSlug: string;
  productName: string;
  at: string;
}

/** 用户最近解锁的成就（个人主页成就墙） */
export async function getRecentUnlocks(userId: string, limit = 6): Promise<RecentUnlock[]> {
  const rows = await prisma.achievementUnlock.findMany({
    where: { userId },
    orderBy: { at: "desc" },
    take: limit,
    select: {
      at: true,
      achievement: {
        select: { name: true, icon: true, product: { select: { slug: true, name: true } } },
      },
    },
  });
  return rows.map((r) => ({
    name: r.achievement.name,
    icon: r.achievement.icon,
    productSlug: r.achievement.product.slug,
    productName: r.achievement.product.name,
    at: r.at,
  }));
}

export async function countUserUnlocks(userId: string): Promise<number> {
  return prisma.achievementUnlock.count({ where: { userId } });
}

export interface ShowcaseAchievement {
  name: string;
  icon: string;
  productSlug: string;
  productName: string;
  /** 全站解锁率 0-100，越低越稀有 */
  rarity: number;
  at: string;
}

/** 成就展柜：用户解锁的成就，按稀有度（最稀有在前）排序 */
export async function getUserAchievementShowcase(userId: string, limit = 6): Promise<ShowcaseAchievement[]> {
  const unlocks = await prisma.achievementUnlock.findMany({
    where: { userId },
    select: {
      at: true,
      achievement: {
        select: { id: true, name: true, icon: true, productId: true, product: { select: { slug: true, name: true } } },
      },
    },
  });
  if (unlocks.length === 0) return [];

  // 批量算稀有度：每个成就的解锁数 / 拥有该产品的人数
  const productIds = [...new Set(unlocks.map((u) => u.achievement.productId))];
  const ownerCounts = new Map<string, number>();
  await Promise.all(
    productIds.map(async (pid) => ownerCounts.set(pid, Math.max(1, await prisma.libraryEntry.count({ where: { productId: pid } })))),
  );
  const achIds = unlocks.map((u) => u.achievement.id);
  const totals = await prisma.achievementUnlock.groupBy({
    by: ["achievementId"],
    where: { achievementId: { in: achIds } },
    _count: { _all: true },
  });
  const totalById = new Map(totals.map((t) => [t.achievementId, t._count._all]));

  return unlocks
    .map((u) => ({
      name: u.achievement.name,
      icon: u.achievement.icon,
      productSlug: u.achievement.product.slug,
      productName: u.achievement.product.name,
      rarity: Math.round(((totalById.get(u.achievement.id) ?? 1) / (ownerCounts.get(u.achievement.productId) ?? 1)) * 100),
      at: u.at,
    }))
    .sort((a, b) => a.rarity - b.rarity || b.at.localeCompare(a.at))
    .slice(0, limit);
}
