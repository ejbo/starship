import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";

/** GET /api/v1/me → 用户公开资料（scope identity） */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token", "缺少或无效的 access token");
  if (!requireScope(token, "identity")) return jsonError(403, "insufficient_scope", "需要 identity 授权");

  const u = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { handle: true, name: true, avatarHue: true, level: true, gatewayTokens: true },
  });
  if (!u) return jsonError(404, "not_found");

  // 仅公开字段 + 本人 token 余额（供应用展示/同步）；绝不含邮箱/密钥
  return NextResponse.json({ handle: u.handle, name: u.name, avatarHue: u.avatarHue, level: u.level, gatewayTokens: u.gatewayTokens });
}
