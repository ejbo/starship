import { NextResponse } from "next/server";
import { unlockAchievement } from "@/lib/achievement-service";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";

/** POST /api/v1/achievements/unlock { key } → 为令牌所属用户解锁（scope achievements:write） */
export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "achievements:write")) return jsonError(403, "insufficient_scope", "需要 achievements:write 授权");

  let body: { key?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }
  if (!body.key) return jsonError(400, "invalid_request", "缺少 key");

  try {
    const res = await unlockAchievement(token.productId, token.userId, body.key);
    return NextResponse.json({ unlocked: res.unlocked, alreadyOwned: res.alreadyOwned, name: res.name });
  } catch (e) {
    return jsonError(404, "unknown_achievement", e instanceof Error ? e.message : undefined);
  }
}
