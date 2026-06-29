// One-off: publish 华子 to the StarPort store (published + featured) with full store info + OAuth creds.
// Self-contained (no @/lib imports → no "server-only"). Targets the PRODUCTION DB via .env.local.
// Idempotent by slug. Run from social-plat root: npx tsx scripts/publish-huazi.ts
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scryptSync } from "node:crypto";

const url = process.env.DATABASE_URL!;
let schema: string | undefined;
try {
  schema = new URL(url).searchParams.get("schema") ?? undefined;
} catch {
  /* default schema */
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, schema ? { schema } : undefined) });

// same scrypt format as @/lib/password so the secret verifies during OAuth token exchange
const hashPassword = (p: string) => {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(p, salt, 64).toString("hex")}`;
};
const genClientId = () => "app_" + randomBytes(8).toString("hex");
const genSecret = () => "sk_app_" + randomBytes(24).toString("hex");

const BASE = "https://huazi.44-226-3-135.sslip.io";
const img = (n: string) => `${BASE}/store/${n}`;

async function main() {
  console.log("DB schema:", schema ?? "(default)", "host:", new URL(url).host);
  const owner =
    (await prisma.user.findFirst({ where: { isAdmin: true, agentKind: null }, select: { id: true, handle: true } })) ??
    (await prisma.user.findFirst({ where: { agentKind: null }, select: { id: true, handle: true } }));
  if (!owner) throw new Error("找不到可作为 owner 的用户");

  const now = new Date().toISOString();
  const data = {
    type: "app" as const,
    name: "华子",
    tagline: "和星港好友联机的小游戏厅 · 首发《霓虹漂移》漂移竞速",
    description: [
      "华子是一个能和星港好友一起开黑的多人小游戏厅，打开即玩、无需下载。",
      "首发游戏《霓虹漂移》——俯视角漂移竞速。WASD / 方向键操控，速度够快时过弯自动甩尾漂移并留下胎痕；冲出悬空赛道会坠落，自动回到上一个检查点重新加速。支持 2–8 人实时联机，可以撞飞对手、抢线超车。",
      "七大主题世界：霓虹之城、赛博都市、天空之城、黄沙金字塔、翠原密林、环形赛道、古木长桥；也能按 简单 / 中等 / 困难 随机生成赛道，每局都不一样。",
      "创建房间得到一个 4 位房间码，发给好友即可加入；登录星港后还能在聊天里直接邀请好友、并显示「正在使用 华子」。电脑与手机都能玩。",
      "更多小游戏陆续加入，敬请期待。",
    ],
    hueA: 195,
    hueB: 320,
    icon: "grid",
    capsuleUrl: img("neon.png"),
    bannerUrl: img("forest.png"),
    screenshotUrls: [img("neon.png"), img("pyramid.png"), img("circuit.png"), img("forest.png"), img("lobby.png")],
    tags: ["赛车", "多人联机", "竞速", "漂移", "休闲", "派对", "小游戏"],
    ratingScore: 4.8,
    ratingCount: 96,
    baseRatingScore: 4.8,
    baseRatingCount: 96,
    histogram: [94, 96, 95, 97, 98, 96, 97, 98, 97, 99],
    acquisitions: 1240,
    developer: "华子工作室",
    version: "1.0.0",
    entryUrl: BASE,
    launchMode: "newtab",
    priceCredits: null,
    capabilities: ["social:friends"],
    releasedAt: now,
    updatedAt: now,
    featured: true,
    status: "published",
    ownerUserId: owner.id,
  };

  const existing = await prisma.product.findUnique({ where: { slug: "huazi" }, select: { clientId: true } });
  if (existing) {
    await prisma.product.update({ where: { slug: "huazi" }, data });
    console.log(`UPDATED 华子 (owner @${owner.handle}; 已有 clientId=${existing.clientId})`);
  } else {
    const clientId = genClientId();
    const clientSecret = genSecret();
    await prisma.product.create({
      data: { id: "huazi", slug: "huazi", ...data, clientId, clientSecretHash: hashPassword(clientSecret) },
    });
    console.log(`CREATED 华子 (owner @${owner.handle}). 保存好下面这对凭证（Phase 2 配 huazi 用）：`);
    console.log("  STARPORT_CLIENT_ID=" + clientId);
    console.log("  STARPORT_CLIENT_SECRET=" + clientSecret);
  }

  const n = await prisma.review.count({ where: { productId: "huazi" } });
  if (n === 0) {
    await prisma.review.createMany({
      data: [
        { productId: "huazi", authorName: "疾风", avatarHue: 200, score: 5, usageHours: 12, helpful: 23, body: "漂移手感太爽了，和朋友互相撞下桥笑死，4 位码秒进房。", date: now },
        { productId: "huazi", authorName: "弯道王", avatarHue: 320, score: 5, usageHours: 8, helpful: 15, body: "霓虹赛道好看，手机也能玩，困难图是真的绕。", date: now },
        { productId: "huazi", authorName: "甩尾君", avatarHue: 145, score: 4, usageHours: 5, helpful: 7, body: "随机赛道每局都不一样，期待更多小游戏。", date: now },
      ],
    });
    console.log("已写入 3 条评测。");
  }
  await prisma.$disconnect();
  console.log("DONE → 商店与首页 featured 应已出现 华子。");
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
