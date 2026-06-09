import "server-only";
import { prisma } from "@/lib/db";

/**
 * 当前会话用户。Phase 1b 占位：固定返回种子用户 me。
 * Phase 1b-auth 将替换为 iron-session 读取真实登录态。
 */
export async function getSessionUserId(): Promise<string> {
  const me = await prisma.user.findUniqueOrThrow({ where: { handle: "me" }, select: { id: true } });
  return me.id;
}

/** 未登录返回 null。Phase 1c 占位：始终返回种子用户。Phase 1d-auth 替换为真实登录态。 */
export async function getSessionUserIdOrNull(): Promise<string | null> {
  const me = await prisma.user.findUnique({ where: { handle: "me" }, select: { id: true } });
  return me?.id ?? null;
}
