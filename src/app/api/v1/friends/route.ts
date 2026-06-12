import { NextResponse } from "next/server";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { getAppFriends } from "@/lib/app-social-service";

/**
 * GET /api/v1/friends （scope: social:read）
 * 返回当前用户的好友 + 在线状态 + 每位好友未读私聊数，供应用内悬浮好友 dock。
 */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "social:read")) return jsonError(403, "insufficient_scope", "需要 social:read 授权");
  const friends = await getAppFriends(token.userId);
  return NextResponse.json({ friends });
}
