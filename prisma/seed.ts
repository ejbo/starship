/**
 * 把 mock 数据灌入数据库。
 * - 默认非破坏性：库里已有用户则直接跳过，绝不清库（保护你注册的账号）。
 * - 强制重置（清库重灌）：SEED_FORCE=1 pnpm db:seed   或   pnpm db:reset
 * 运行：pnpm db:seed
 */
import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local", override: false });
dotenv({ path: ".env", override: false });

import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { products } from "../src/lib/mock/products";
import { PRODUCT_MEDIA } from "./product-media";
import { activity } from "../src/lib/mock/activity";
import { currentUser, friends } from "../src/lib/mock/users";

/** 与 src/lib/password.ts 同算法 */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** 与 src/lib/tokens.ts 同算法的好友码：8 位纯数字（首位非 0） */
function friendCode(): string {
  const b = randomBytes(8);
  let s = String((b[0] % 9) + 1);
  for (let i = 1; i < 8; i++) s += String(b[i] % 10);
  return s;
}

/** 与 src/lib/crypto.ts 同算法（种子脚本独立运行，避免 server-only 导入） */
function encryptSecret(plaintext: string): string {
  const key = Buffer.from(process.env.STARPORT_SECRET!, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

const seedUrl = process.env.DATABASE_URL!;
// 与 src/lib/db.ts 一致：连接串带 ?schema=xxx 时把数据写进该 schema（生产 starport）。
let seedSchema: string | undefined;
try {
  seedSchema = new URL(seedUrl).searchParams.get("schema") ?? undefined;
} catch {
  // 非标准 URL：退回默认 schema
}
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: seedUrl },
    seedSchema ? { schema: seedSchema } : undefined,
  ),
});

/** 防误清：DATABASE_URL 指向远程（非本机）库时，破坏性重灌需显式 SEED_ALLOW_REMOTE=1 */
function assertNotRemoteWipe() {
  if (process.env.SEED_FORCE !== "1") return;
  let host = "";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {}
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "" || host === "::1";
  if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "1") {
    console.error(
      `\n⛔ 拒绝清库：DATABASE_URL 指向远程库（${host}）。\n` +
        `   这会清空线上数据。若确实要清线上库重灌，请显式：SEED_ALLOW_REMOTE=1 pnpm db:reset\n`,
    );
    process.exit(1);
  }
}

async function main() {
  const force = process.env.SEED_FORCE === "1";
  assertNotRemoteWipe();
  const existing = await prisma.user.count();
  if (existing > 0 && !force) {
    console.log(`数据库已有 ${existing} 个用户，跳过种子（不清库）。如需清库重灌：pnpm db:reset`);
    return;
  }

  // 仅在强制重置或空库时清库
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
        capsuleUrl: PRODUCT_MEDIA[p.slug]?.capsuleUrl ?? null,
        bannerUrl: PRODUCT_MEDIA[p.slug]?.bannerUrl ?? null,
        screenshotUrls: PRODUCT_MEDIA[p.slug]?.screenshotUrls ?? [],
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
      friendCode: friendCode(),
      name: currentUser.name,
      passwordHash: hashPassword("starport123"),
      avatarHue: currentUser.avatarHue,
      level: currentUser.level,
      signature: currentUser.signature,
      tokenBalance: currentUser.tokenBalance,
      credits: 5000,
      badges: currentUser.badges,
      showcase: currentUser.showcase,
    },
  });

  // sdk-playground 作为 me 拥有的开发者应用，配开放 API 凭证与成就 schema
  const demoApp = await prisma.product.update({
    where: { slug: "sdk-playground" },
    data: {
      status: "published",
      ownerUserId: me.id,
      clientId: "app_demo123",
      clientSecretHash: hashPassword("sk_app_demo_secret_123"),
    },
  });
  const demoAchievements = [
    { key: "first_open", name: "初次见面", description: "首次启动 SDK Playground", icon: "sparkles", sort: 0 },
    { key: "explorer", name: "探索者", description: "用过 SDK 的全部三种能力", icon: "telescope", sort: 1 },
    { key: "power_user", name: "重度用户", description: "累计使用超过 10 小时", icon: "cpu", sort: 2 },
  ];
  for (const a of demoAchievements) {
    await prisma.achievement.create({ data: { productId: demoApp.id, ...a } });
  }
  // 给 me 预解锁一个，成就墙有内容（first_open 留给现场演示）
  const explorer = await prisma.achievement.findUniqueOrThrow({
    where: { productId_key: { productId: demoApp.id, key: "explorer" } },
  });
  await prisma.achievementUnlock.create({
    data: { achievementId: explorer.id, userId: me.id, at: new Date().toISOString() },
  });
  // me 需先拥有该应用，稀有度分母与库联动
  await prisma.libraryEntry.upsert({
    where: { userId_productId: { userId: me.id, productId: demoApp.id } },
    update: {},
    create: { userId: me.id, productId: demoApp.id, acquiredAt: "2026-06-09", lastUsedAt: "2026-06-09", usageHours: 2 },
  });

  // 离线好友的「最后在线」与资料背景（好友悬停卡演示；shanyue 用视频体现动态背景）
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  const U = (id: string, w: number) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;
  const FRIEND_EXTRAS: Record<string, { lastSeenMinsAgo?: number; banner?: string }> = {
    linyuan: { banner: U("photo-1451187580459-43490279c0fa", 800) },
    bluewhale: { banner: U("photo-1526374965328-7f61d4dc18c5", 800) },
    azhi: { banner: U("photo-1620641788421-7a1c342ea42e", 800) },
    shanyue: { banner: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" },
    chenzhou: { lastSeenMinsAgo: 5 * 60 },
    oldcat: { lastSeenMinsAgo: 26 * 60 },
    qingteng: { lastSeenMinsAgo: 3 * 24 * 60 },
  };

  const friendByHandle = new Map<string, string>();
  for (const [idx, f] of friends.entries()) {
    const extra = FRIEND_EXTRAS[f.handle] ?? {};
    const friend = await prisma.user.create({
      data: {
        handle: f.handle,
        friendCode: friendCode(),
        name: f.name,
        // 好友演示账号统一口令（可用任意好友 handle / friend123 登录体验另一视角）
        passwordHash: hashPassword("friend123"),
        avatarHue: f.avatarHue,
        level: f.level,
        // 种子展示状态（好友未真实登录时由 friends-service 兜底使用）
        presenceKind: f.presence.kind,
        presenceDetail: f.presence.detail ?? null,
        lastSeenAt: extra.lastSeenMinsAgo ? iso(extra.lastSeenMinsAgo) : null,
        profileBannerUrl: extra.banner ?? null,
      },
    });
    friendByHandle.set(f.handle, friend.id);
    // acceptedAt 按列表顺序错开（越靠前=越早加），让「最近添加」有合理排序
    const acceptedAt = iso((idx + 1) * 24 * 60);
    await prisma.friendEdge.create({ data: { aId: me.id, bId: friend.id, status: "accepted", createdAt: acceptedAt, acceptedAt } });
  }
  const chatSeed: Array<[string, Array<["me" | "friend", string, number]>]> = [
    ["linyuan", [["friend", "你上次说的那个对比技巧，怎么设置来着？", 1440], ["me", "新建会话选「双栏」，左边固定 Claude", 1435], ["friend", "好使，今天省了一半时间", 120]]],
    ["bluewhale", [["friend", "周五圆桌我把新驯的纪要 Agent 带上", 300], ["friend", "它现在能区分结论和待办了", 299]]],
    ["azhi", [["me", "读书会纪要发我一份？", 2880], ["friend", "在圆桌归档里，搜「盲视」就有", 2870]]],
    ["shanyue", [["friend", "看下你的用量看板，文献 Agent 又夜跑了", 480], ["me", "已经设了日限额，让它跑（", 470]]],
  ];
  for (const [handle, msgs] of chatSeed) {
    const fid = friendByHandle.get(handle);
    if (!fid) continue;
    for (const [who, body, minsAgo] of msgs) {
      await prisma.message.create({
        data: {
          fromId: who === "me" ? me.id : fid,
          toId: who === "me" ? fid : me.id,
          body,
          at: iso(minsAgo),
        },
      });
    }
  }

  // 群组聊天种子：周五圆桌组（多频道 + 历史消息）
  const groupMemberIds = ["linyuan", "bluewhale", "azhi", "shanyue"]
    .map((h) => friendByHandle.get(h))
    .filter((id): id is string => !!id);
  const group = await prisma.chatGroup.create({
    data: {
      name: "周五圆桌组",
      ownerId: me.id,
      createdAt: iso(7 * 24 * 60),
      members: {
        create: [{ userId: me.id, joinedAt: iso(7 * 24 * 60) }, ...groupMemberIds.map((userId) => ({ userId, joinedAt: iso(7 * 24 * 60) }))],
      },
      channels: {
        create: [
          { name: "大厅", kind: "text", sort: 0 },
          { name: "资料分享", kind: "text", sort: 1 },
          { name: "圆桌语音", kind: "voice", sort: 2 },
        ],
      },
    },
    include: { channels: true },
  });
  const hall = group.channels.find((c) => c.name === "大厅")!;
  const share = group.channels.find((c) => c.name === "资料分享")!;
  const groupChat: Array<[string, string, number]> = [
    ["bluewhale", "周五圆桌确认一下时间，还是晚上八点？", 26 * 60],
    ["linyuan", "可以，我提前把对比测试跑完", 25 * 60 + 40],
    ["azhi", "纪要 Agent 我带新的来，这次能区分结论和待办", 25 * 60 + 20],
    ["me", "OK，八点见。开了个「资料分享」频道，材料丢那边", 24 * 60],
    ["shanyue", "收到 👌", 23 * 60 + 50],
  ];
  for (const [h, body, minsAgo] of groupChat) {
    const fromId = h === "me" ? me.id : friendByHandle.get(h);
    if (!fromId) continue;
    await prisma.groupMessage.create({ data: { groupId: group.id, channelId: hall.id, fromId, body, at: iso(minsAgo) } });
  }
  const linyuanId = friendByHandle.get("linyuan");
  if (linyuanId) {
    await prisma.groupMessage.create({
      data: { groupId: group.id, channelId: share.id, fromId: linyuanId, body: "上周说的多模型对比表格整理好了，回头发这里", at: iso(20 * 60) },
    });
  }

  // 演示托管 Agent（me 拥有，秒上线）：初见即可在 AI Agents tab 直接对话
  const demoAgent = await prisma.user.create({
    data: {
      handle: "nova",
      name: "Nova",
      kind: "agent",
      agentOwnerId: me.id,
      agentKind: "hosted",
      agentPersona: "你是 Nova，星港平台的助理 Agent。简洁、靠谱、偶尔用一个 emoji。",
      avatarHue: 265,
      level: 1,
      signature: "星港托管助理 · 随时在线",
      lastSeenAt: new Date().toISOString(),
    },
  });
  await prisma.friendEdge.create({ data: { aId: me.id, bId: demoAgent.id, status: "accepted", createdAt: iso(60), acceptedAt: iso(60) } });

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
    chatGroups: await prisma.chatGroup.count(),
    groupMessages: await prisma.groupMessage.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
