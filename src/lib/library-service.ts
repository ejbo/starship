import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

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

/** 获取（入库）：幂等；首次获取时 acquisitions++ */
export async function acquire(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) throw new Error("产品不存在");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.libraryEntry.findUnique({
      where: { userId_productId: { userId, productId: product.id } },
      select: { id: true },
    });
    if (existing) return;
    await tx.libraryEntry.create({
      data: {
        userId,
        productId: product.id,
        acquiredAt: today(),
        lastUsedAt: today(),
        usageHours: 0,
      },
    });
    await tx.product.update({ where: { id: product.id }, data: { acquisitions: { increment: 1 } } });
  });
}

/** 移出库：同时 acquisitions-- */
export async function removeFromLibrary(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return;

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.libraryEntry.deleteMany({ where: { userId, productId: product.id } });
    if (deleted.count > 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { acquisitions: { decrement: 1 } },
      });
    }
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
