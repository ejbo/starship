import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";

/**
 * POST /api/v1/stats { playtimeMinutes?, stats?: {key: value} }（scope stats:write）
 * playtime 累加进库的使用时长；自定义 stats 落 StatRecord。
 */
export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "stats:write")) return jsonError(403, "insufficient_scope", "需要 stats:write 授权");

  let body: { playtimeMinutes?: number; stats?: Record<string, number> };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }

  const { productId, userId } = token;

  // 游戏时长 → 累加 StatRecord 与库使用时长
  if (typeof body.playtimeMinutes === "number" && body.playtimeMinutes > 0) {
    const minutes = Math.round(body.playtimeMinutes);
    await prisma.statRecord.upsert({
      where: { productId_userId_key: { productId, userId, key: "playtime_minutes" } },
      update: { value: { increment: minutes } },
      create: { productId, userId, key: "playtime_minutes", value: minutes },
    });
    // 同步进库使用时长（小时，向下取整增量）
    const entry = await prisma.libraryEntry.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true, usageHours: true },
    });
    if (entry) {
      const total = await prisma.statRecord.findUnique({
        where: { productId_userId_key: { productId, userId, key: "playtime_minutes" } },
        select: { value: true },
      });
      const mins = total?.value ?? 0;
      await prisma.libraryEntry.update({
        where: { id: entry.id },
        data: { usageHours: Math.floor(mins / 60), usageMinutes: mins, lastUsedAt: new Date().toISOString().slice(0, 10) },
      });
    }
  }

  // 自定义统计
  if (body.stats && typeof body.stats === "object") {
    for (const [key, value] of Object.entries(body.stats)) {
      if (typeof value !== "number") continue;
      await prisma.statRecord.upsert({
        where: { productId_userId_key: { productId, userId, key } },
        update: { value },
        create: { productId, userId, key, value },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
