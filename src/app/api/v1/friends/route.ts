import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { friendIdsOf } from "@/lib/friends-service";

/** GET /api/v1/friends → 当前用户的（人类）好友列表（scope social:friends） */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token", "缺少或无效的 access token");
  if (!requireScope(token, "social:friends")) return jsonError(403, "insufficient_scope", "需要 social:friends 授权");

  const ids = await friendIdsOf(token.userId);
  if (!ids.length) return NextResponse.json({ friends: [] });

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, avatarHue: true, lastSeenAt: true, agentKind: true },
  });
  const now = Date.now();
  const friends = users
    .filter((u) => !u.agentKind) // human friends only (game invites don't go to agents)
    .map((u) => ({
      id: u.id,
      name: u.name,
      avatarHue: u.avatarHue,
      online: !!u.lastSeenAt && now - Date.parse(u.lastSeenAt) < 5 * 60 * 1000,
    }));
  return NextResponse.json({ friends });
}
