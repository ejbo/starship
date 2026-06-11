import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { getSessionUserId } from "@/lib/session";
import { generateAppSecret, generateClientId, slugify } from "@/lib/tokens";
import type { ProductType } from "@/lib/types";

export interface MyAppRow {
  id: string;
  slug: string;
  name: string;
  type: ProductType;
  status: string;
  acquisitions: number;
  ratingScore: number;
  ratingCount: number;
  achievementCount: number;
}

export async function listMyApps(): Promise<MyAppRow[]> {
  const userId = await getSessionUserId();
  const rows = await prisma.product.findMany({
    where: { ownerUserId: userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { achievements: true } } },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type as ProductType,
    status: p.status,
    acquisitions: p.acquisitions,
    ratingScore: p.ratingScore,
    ratingCount: p.ratingCount,
    achievementCount: p._count.achievements,
  }));
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export interface CreatedApp {
  id: string;
  slug: string;
  clientId: string;
  /** 明文密钥，仅此一次返回 */
  clientSecret: string;
}

export async function createApp(input: { name: string; type: ProductType; tagline: string; slug?: string }): Promise<CreatedApp> {
  const userId = await getSessionUserId();
  const name = input.name.trim();
  if (!name) throw new Error("应用名不能为空");

  // 开发者可自定义 slug（会规范化 + 查重，冲突自动加后缀）；留空则由应用名派生
  const slug = await uniqueSlug(input.slug?.trim() || name);
  const clientId = generateClientId();
  const clientSecret = generateAppSecret();
  const today = new Date().toISOString().slice(0, 10);
  // 由 name 稳定派生封面色相
  const hueA = hueFromString(slug);

  const product = await prisma.product.create({
    data: {
      id: "p-" + randomUUID(),
      slug,
      type: input.type,
      name,
      tagline: input.tagline.trim() || "（待完善）",
      description: ["（待完善）"],
      hueA,
      hueB: (hueA + 40) % 360,
      icon: "grid",
      tags: [],
      ratingScore: 0,
      ratingCount: 0,
      baseRatingScore: 0,
      baseRatingCount: 0,
      histogram: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      acquisitions: 0,
      developer: await developerName(userId),
      priceCredits: null,
      capabilities: [],
      releasedAt: today,
      updatedAt: today,
      status: "draft",
      ownerUserId: userId,
      clientId,
      clientSecretHash: hashPassword(clientSecret),
    },
  });

  return { id: product.id, slug: product.slug, clientId, clientSecret };
}

/** 取我拥有的应用（含成就），非所有者返回 null */
export async function getMyApp(id: string) {
  const userId = await getSessionUserId();
  const product = await prisma.product.findFirst({
    where: { id, ownerUserId: userId },
    include: { achievements: { orderBy: { sort: "asc" } } },
  });
  return product;
}

/** 开发者总览：应用数 / 已上架 / 总获取量 / 均分 / 累计收益（点数） */
export async function getDeveloperStats() {
  const userId = await getSessionUserId();
  const apps = await prisma.product.findMany({
    where: { ownerUserId: userId },
    select: { acquisitions: true, ratingScore: true, ratingCount: true, status: true },
  });
  const earnings = await prisma.creditTransaction.aggregate({
    where: { userId, kind: "earning" },
    _sum: { amount: true },
  });
  const rated = apps.filter((a) => a.ratingCount > 0);
  return {
    appCount: apps.length,
    publishedCount: apps.filter((a) => a.status === "published").length,
    totalAcquisitions: apps.reduce((s, a) => s + a.acquisitions, 0),
    avgRating: rated.length ? rated.reduce((s, a) => s + a.ratingScore, 0) / rated.length : 0,
    earnings: earnings._sum.amount ?? 0,
  };
}

export interface UpdateAppInput {
  tagline: string;
  description: string;
  tags: string[];
  capabilities: string[];
  icon: string;
  priceCredits: number | null;
}

export async function updateApp(id: string, input: UpdateAppInput): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({
    where: { id, ownerUserId: userId },
    data: {
      tagline: input.tagline.trim() || "（待完善）",
      description: splitParas(input.description),
      tags: input.tags,
      capabilities: input.capabilities,
      icon: input.icon || "grid",
      priceCredits: input.priceCredits,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  });
}

/** 单页托管应用的起始模板（含 SDK 用法），开发者可一键填入后改 */
export const HOSTED_APP_TEMPLATE = `<!doctype html>
<html lang="zh">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>我的星港应用</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f3f5f8; color: #1c2433; }
    h1 { font-size: 20px; }
    button { background: #2563eb; color: #fff; border: 0; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
    #out { margin-top: 16px; white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>你好，<span id="who">…</span></h1>
  <p>这是一个跑在星港沙箱里的托管应用。点下面按钮，经平台 Gateway 调用大模型（你的 Key 不出平台）。</p>
  <button id="ask">问 AI 一个问题</button>
  <div id="out"></div>

  <!-- 平台 SDK：身份 / AI / 存储 / 成就 -->
  <script src="/starport-sdk.js"></script>
  <script>
    starport.ready(async () => {
      const me = await starport.identity();
      document.getElementById('who').textContent = me.name || '访客';
    });
    document.getElementById('ask').onclick = async () => {
      const out = document.getElementById('out');
      out.textContent = '思考中…';
      try {
        const r = await starport.ai.chat('用一句话夸夸星港平台');
        out.textContent = r.reply || JSON.stringify(r);
      } catch (e) { out.textContent = '调用失败：' + e; }
    };
  </script>
</body>
</html>
`;

export type HostingInput =
  | { kind: "external"; entryUrl: string | null; launchMode: string }
  | { kind: "hosted"; hostedHtml: string };

/** 设置应用运行形态：外部部署(entryUrl) 或 平台托管单页(上传 HTML)。仅 owner 可改。 */
export async function updateAppHosting(id: string, input: HostingInput): Promise<void> {
  const userId = await getSessionUserId();
  const app = await prisma.product.findFirst({ where: { id, ownerUserId: userId }, select: { slug: true } });
  if (!app) throw new Error("无权操作");
  const updatedAt = new Date().toISOString().slice(0, 10);

  if (input.kind === "hosted") {
    await prisma.product.updateMany({
      where: { id, ownerUserId: userId },
      data: { hostedHtml: input.hostedHtml, entryUrl: `/api/apps/${app.slug}/serve`, launchMode: "embedded", updatedAt },
    });
  } else {
    await prisma.product.updateMany({
      where: { id, ownerUserId: userId },
      data: {
        hostedHtml: null,
        entryUrl: input.entryUrl?.trim() || null,
        launchMode: input.launchMode === "newtab" ? "newtab" : "embedded",
        updatedAt,
      },
    });
  }
}

export interface AppMediaInput {
  capsuleUrl: string | null;
  bannerUrl: string | null;
  screenshotUrls: string[];
  trailerUrl: string | null;
}

/** 开发者编辑自己应用的媒体（封面/banner/截图/预告）。仅 owner 可改。 */
export async function updateAppMedia(id: string, input: AppMediaInput): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({
    where: { id, ownerUserId: userId },
    data: {
      capsuleUrl: input.capsuleUrl,
      bannerUrl: input.bannerUrl,
      screenshotUrls: input.screenshotUrls,
      trailerUrl: input.trailerUrl,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  });
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({
    where: { id, ownerUserId: userId },
    data: { status: published ? "published" : "draft" },
  });
}

/** 提交审核：草稿 → 待审核（管理员通过后才上架，Steam 式审核流程） */
export async function submitForReview(id: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({ where: { id, ownerUserId: userId, status: "draft" }, data: { status: "pending" } });
}

/** 撤回审核：待审核 → 草稿 */
export async function withdrawReview(id: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({ where: { id, ownerUserId: userId, status: "pending" }, data: { status: "draft" } });
}

/** 开发者下架自己的已上架应用 → 草稿 */
export async function unlistApp(id: string): Promise<void> {
  const userId = await getSessionUserId();
  await prisma.product.updateMany({ where: { id, ownerUserId: userId, status: "published" }, data: { status: "draft" } });
}

export async function regenerateSecret(id: string): Promise<string> {
  const userId = await getSessionUserId();
  const app = await prisma.product.findFirst({ where: { id, ownerUserId: userId }, select: { id: true } });
  if (!app) throw new Error("无权操作");
  const clientSecret = generateAppSecret();
  await prisma.product.update({ where: { id: app.id }, data: { clientSecretHash: hashPassword(clientSecret) } });
  return clientSecret;
}

// ——— 成就 schema ———
export async function addAchievement(productId: string, input: { key: string; name: string; description: string; icon: string }): Promise<void> {
  const userId = await getSessionUserId();
  const app = await prisma.product.findFirst({ where: { id: productId, ownerUserId: userId }, select: { id: true } });
  if (!app) throw new Error("无权操作");
  const key = input.key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  if (!key) throw new Error("成就 key 不能为空");
  const count = await prisma.achievement.count({ where: { productId } });
  await prisma.achievement.create({
    data: {
      productId,
      key,
      name: input.name.trim() || key,
      description: input.description.trim(),
      icon: input.icon || "trophy",
      sort: count,
    },
  });
}

export async function deleteAchievement(achievementId: string): Promise<void> {
  const userId = await getSessionUserId();
  const ach = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: { product: { select: { ownerUserId: true } } },
  });
  if (ach?.product.ownerUserId !== userId) throw new Error("无权操作");
  await prisma.achievement.delete({ where: { id: achievementId } });
}

async function developerName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return u?.name ?? "开发者";
}

function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function splitParas(text: string): string[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return paras.length ? paras : ["（待完善）"];
}
