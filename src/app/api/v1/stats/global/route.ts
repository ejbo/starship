import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError } from "@/lib/api-auth";

/** GET /api/v1/stats/global → 该应用全站成就稀有度% */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");

  const owners = Math.max(1, await prisma.libraryEntry.count({ where: { productId: token.productId } }));
  const achievements = await prisma.achievement.findMany({
    where: { productId: token.productId },
    orderBy: { sort: "asc" },
    include: { _count: { select: { unlocks: true } } },
  });

  return NextResponse.json({
    owners,
    achievements: achievements.map((a) => ({
      key: a.key,
      name: a.name,
      unlocks: a._count.unlocks,
      rarity: Math.round((a._count.unlocks / owners) * 100),
    })),
  });
}
