import { NextResponse } from "next/server";
import { getAchievementsForUser } from "@/lib/achievement-service";
import { authenticate, jsonError } from "@/lib/api-auth";

/** GET /api/v1/achievements → 该应用成就 schema + 当前用户解锁态 */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");

  const achievements = await getAchievementsForUser(token.productId, token.userId);
  return NextResponse.json({
    achievements: achievements.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      unlocked: a.unlocked,
      unlockedAt: a.unlockedAt ?? null,
      rarity: a.rarity,
    })),
  });
}
