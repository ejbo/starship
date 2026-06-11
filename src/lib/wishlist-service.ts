import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId, getSessionUserIdOrNull } from "@/lib/session";

export async function isInWishlist(slug: string): Promise<boolean> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return false;
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return false;
  return Boolean(
    await prisma.wishlistEntry.findUnique({
      where: { userId_productId: { userId, productId: product.id } },
      select: { id: true },
    }),
  );
}

export async function addToWishlist(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) throw new Error("产品不存在");
  await prisma.wishlistEntry.upsert({
    where: { userId_productId: { userId, productId: product.id } },
    update: {},
    create: { userId, productId: product.id, createdAt: new Date().toISOString() },
  });
}

export async function removeFromWishlist(slug: string): Promise<void> {
  const userId = await getSessionUserId();
  const product = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return;
  await prisma.wishlistEntry.deleteMany({ where: { userId, productId: product.id } });
}

export async function getWishlistCount(): Promise<number> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return 0;
  return prisma.wishlistEntry.count({ where: { userId } });
}
