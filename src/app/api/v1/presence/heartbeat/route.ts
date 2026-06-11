import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";

const today = () => new Date().toISOString().slice(0, 10);
// 单次心跳最多累计的活跃秒数：客户端约每 60s 一拍，留余量到 120s 以容忍丢一拍；
// 超过则视为离开/挂起，不计入（避免标签页后台很久后回来一次性灌入大量时长）。
const MAX_BEAT_SECONDS = 120;

/**
 * POST /api/v1/presence/heartbeat { activity: string, secondsActive?: number }（scope presence:update）
 * 外部应用在被使用期间周期上报：
 *  1) 刷新「正在使用 <activity>」富状态（好友面板/主页可见，2s 轮询自动同步）
 *  2) 按 secondsActive 累加使用时长（StatRecord playtime_seconds → LibraryEntry.usageHours）
 */
export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "presence:update")) {
    return jsonError(403, "insufficient_scope", "需要 presence:update 授权");
  }

  let body: { activity?: string; secondsActive?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }

  const { productId, userId } = token;
  const activity = String(body.activity ?? "").trim().slice(0, 60);
  if (!activity) return jsonError(400, "invalid_request", "activity 必填");

  const now = new Date().toISOString();

  // 1) 富状态
  await prisma.user.update({
    where: { id: userId },
    data: { currentActivity: activity, activityAt: now, lastSeenAt: now },
  });

  // 2) 使用时长（按秒累加，clamp 防异常）
  const seconds = Math.max(0, Math.min(MAX_BEAT_SECONDS, Math.round(Number(body.secondsActive) || 0)));
  if (seconds > 0) {
    const stat = await prisma.statRecord.upsert({
      where: { productId_userId_key: { productId, userId, key: "playtime_seconds" } },
      update: { value: { increment: seconds } },
      create: { productId, userId, key: "playtime_seconds", value: seconds },
    });
    const day = today();
    const hours = Math.floor(stat.value / 3600);
    const minutes = Math.floor(stat.value / 60);
    // 没有库条目就建一条，否则使用时长无处显示（newtab 启动不一定走 acquire）。
    await prisma.libraryEntry.upsert({
      where: { userId_productId: { userId, productId } },
      update: { usageHours: hours, usageMinutes: minutes, lastUsedAt: day },
      create: { userId, productId, acquiredAt: day, lastUsedAt: day, usageHours: hours, usageMinutes: minutes },
    });
  }

  return NextResponse.json({ ok: true });
}
