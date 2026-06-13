import { NextResponse } from "next/server";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { getAppSocialSnapshot } from "@/lib/app-social-service";

/**
 * GET /api/v1/social/snapshot （scope: social:read）
 * 嵌入式好友面板（/widget/friends）的数据源：me + friends(+presence) + groups + requestCount，
 * 形状对齐平台真实 FriendsPanel 的入参。令牌鉴权（不依赖会话 cookie，便于跨源 iframe 使用）。
 */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "social:read")) return jsonError(403, "insufficient_scope", "需要 social:read 授权");
  const snapshot = await getAppSocialSnapshot(token.userId);
  return NextResponse.json(snapshot, { headers: { "cache-control": "no-store" } });
}
