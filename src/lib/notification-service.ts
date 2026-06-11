import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserIdOrNull } from "@/lib/session";

export async function notify(userId: string, n: { kind: string; title: string; body?: string; href?: string }) {
  await prisma.notification.create({
    data: { userId, kind: n.kind, title: n.title, body: n.body ?? "", href: n.href ?? null, read: false, createdAt: new Date().toISOString() },
  });
}

export async function getUnreadCount(): Promise<number> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return 0;
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function getNotifications(limit = 40) {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return [];
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
}

export async function markAllRead() {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return;
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
