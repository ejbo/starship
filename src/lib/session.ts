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
