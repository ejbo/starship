/**
 * 把 Phase 0 的 mock 数据灌入数据库（幂等：先清空再插入）。
 * 运行：pnpm db:seed
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

import { createCipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { products } from "../src/lib/mock/products";
import { activity } from "../src/lib/mock/activity";
import { currentUser, friends } from "../src/lib/mock/users";

/** 与 src/lib/crypto.ts 同算法（种子脚本独立运行，避免 server-only 导入） */
function encryptSecret(plaintext: string): string {
  const key = Buffer.from(process.env.STARPORT_SECRET!, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await prisma.usageRecord.deleteMany();
  await prisma.apiCredential.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.libraryEntry.deleteMany();
  await prisma.review.deleteMany();
  await prisma.friendEdge.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  for (const p of products) {
    await prisma.product.create({
      data: {
        id: p.id,
        slug: p.slug,
        type: p.type,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        hueA: p.art.hueA,
        hueB: p.art.hueB,
        icon: p.art.icon,
        tags: p.tags,
        ratingScore: p.rating.score,
        ratingCount: p.rating.count,
        baseRatingScore: p.rating.score,
        baseRatingCount: p.rating.count,
        histogram: p.rating.histogram,
        acquisitions: p.acquisitions,
        developer: p.developer,
        version: p.version ?? null,
        entryUrl: p.entry?.url ?? null,
        priceCredits: p.price === "free" ? null : p.price.credits,
        capabilities: p.capabilities,
        releasedAt: p.releasedAt,
        updatedAt: p.updatedAt,
        featured: p.featured ?? false,
        reviews: {
          create: p.reviews.map((r) => ({
            authorName: r.author,
            avatarHue: r.avatarHue,
            isAgent: r.isAgent ?? false,
            score: r.score,
            usageHours: r.usageHours,
            helpful: r.helpful,
            body: r.body,
            date: r.date,
          })),
        },
      },
    });
  }

  const me = await prisma.user.create({
    data: {
      handle: currentUser.handle,
      name: currentUser.name,
      avatarHue: currentUser.avatarHue,
      level: currentUser.level,
      signature: currentUser.signature,
      tokenBalance: currentUser.tokenBalance,
      badges: currentUser.badges,
      showcase: currentUser.showcase,
    },
  });

  for (const f of friends) {
    const friend = await prisma.user.create({
      data: {
        handle: f.handle,
        name: f.name,
        avatarHue: f.avatarHue,
        level: f.level,
      },
    });
    await prisma.friendEdge.create({ data: { aId: me.id, bId: friend.id } });
  }

  const productBySlug = new Map(products.map((p) => [p.slug, p.id]));
  for (const entry of currentUser.library) {
    const productId = productBySlug.get(entry.slug);
    if (!productId) continue;
    await prisma.libraryEntry.create({
      data: {
        userId: me.id,
        productId,
        acquiredAt: entry.acquiredAt,
        lastUsedAt: entry.lastUsedAt ?? null,
        usageHours: entry.usageHours,
      },
    });
  }

  // me 已配置的 API 密钥（假明文，加密入库）
  const seedCreds = [
    { provider: "anthropic", label: "个人主力", plaintext: "sk-ant-api03-seed-DEMO-7f3a9c2b1e", dailyTokenLimit: 2_000_000 },
    { provider: "openai", label: "备用", plaintext: "sk-proj-seed-DEMO-a1b2c3d4e5", dailyTokenLimit: null as number | null },
  ];
  for (const c of seedCreds) {
    await prisma.apiCredential.create({
      data: {
        userId: me.id,
        provider: c.provider,
        label: c.label,
        ciphertext: encryptSecret(c.plaintext),
        last4: c.plaintext.slice(-4),
        dailyTokenLimit: c.dailyTokenLimit,
        createdAt: "2026-02-24",
      },
    });
  }

  // 用量记录：覆盖多个应用/provider/天
  const usageSeed: Array<[string, string, string, number, number, number]> = [
    // productSlug, provider, model, tokensIn, tokensOut, costCents
    ["multillm-chat", "anthropic", "claude-fable-5", 182000, 96000, 412],
    ["multillm-chat", "openai", "gpt-5", 88000, 41000, 196],
    ["paper-pilot", "anthropic", "claude-fable-5", 240000, 71000, 503],
    ["roundtable", "anthropic", "claude-fable-5", 61000, 38000, 158],
    ["galaxy-reader", "google", "gemini-3-pro", 53000, 22000, 71],
    ["deep-research", "anthropic", "claude-fable-5", 410000, 128000, 902],
    ["nebula-coder", "anthropic", "claude-fable-5", 77000, 35000, 168],
  ];
  const days = ["2026-06-05", "2026-06-06", "2026-06-07", "2026-06-08", "2026-06-09"];
  for (let d = 0; d < days.length; d++) {
    const scale = 0.7 + d * 0.12; // 逐日上升的走势
    for (const [productSlug, provider, model, tin, tout, cost] of usageSeed) {
      await prisma.usageRecord.create({
        data: {
          userId: me.id,
          productSlug,
          provider,
          model,
          tokensIn: Math.round(tin * scale),
          tokensOut: Math.round(tout * scale),
          costCents: Math.round(cost * scale),
          day: days[d],
        },
      });
    }
  }

  let sort = 0;
  for (const event of activity) {
    await prisma.activityEvent.create({
      data: {
        actorName: event.actor.name,
        actorHue: event.actor.avatarHue,
        actorIsAgent: event.actor.isAgent ?? false,
        verb: event.verb,
        productSlug: event.productSlug ?? null,
        detail: event.detail ?? null,
        at: event.at,
        sort: sort++,
      },
    });
  }

  const counts = {
    products: await prisma.product.count(),
    reviews: await prisma.review.count(),
    users: await prisma.user.count(),
    friendEdges: await prisma.friendEdge.count(),
    libraryEntries: await prisma.libraryEntry.count(),
    activity: await prisma.activityEvent.count(),
    credentials: await prisma.apiCredential.count(),
    usageRecords: await prisma.usageRecord.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
