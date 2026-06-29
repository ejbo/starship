import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { friendIdsOf } from "@/lib/friends-service";

/**
 * POST /api/v1/invites { friendId, roomCode, gameName?, hostName? }（scope social:invite）
 * 代当前用户向某位好友的聊天发送一条「加入游戏」邀请卡（kind=app-invite，payload 存于 body JSON）。
 * 游戏地址从该应用注册时的 entryUrl 推导，应用无法伪造跳转目标。
 */
export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token", "缺少或无效的 access token");
  if (!requireScope(token, "social:invite")) return jsonError(403, "insufficient_scope", "需要 social:invite 授权");

  let body: { friendId?: string; roomCode?: string; gameName?: string; hostName?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }

  const friendId = String(body.friendId ?? "");
  if (!friendId) return jsonError(400, "invalid_request", "friendId 必填");

  // 必须确实是好友，杜绝应用借 token 给陌生人发卡
  const ids = await friendIdsOf(token.userId);
  if (!ids.includes(friendId)) return jsonError(403, "not_friend", "对方不是你的好友");

  const product = await prisma.product.findUnique({
    where: { id: token.productId },
    select: { name: true, icon: true, entryUrl: true },
  });
  const sender = await prisma.user.findUnique({ where: { id: token.userId }, select: { name: true } });

  const roomCode = String(body.roomCode ?? "").slice(0, 16);
  const base = product?.entryUrl ?? "";
  const deepLink = base ? `${base}${base.includes("?") ? "&" : "?"}join=${encodeURIComponent(roomCode)}` : "";

  const payload = JSON.stringify({
    appName: product?.name ?? "应用",
    appIcon: product?.icon ?? null,
    gameName: String(body.gameName ?? product?.name ?? "游戏").slice(0, 24),
    hostName: String(body.hostName ?? sender?.name ?? "好友").slice(0, 24),
    roomCode,
    deepLink,
  });

  const now = new Date().toISOString();
  await prisma.message.create({
    data: { fromId: token.userId, toId: friendId, body: payload, kind: "app-invite", at: now, updatedAt: now },
  });
  return NextResponse.json({ ok: true });
}
