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

export async function createApp(input: { name: string; type: ProductType; tagline: string }): Promise<CreatedApp> {
  const userId = await getSessionUserId();
  const name = input.name.trim();
  if (!name) throw new Error("应用名不能为空");

  const slug = await uniqueSlug(name);
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

export interface UpdateAppInput {
  tagline: string;
  description: string;
  tags: string[];
  capabilities: string[];
  entryUrl: string | null;
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
      entryUrl: input.entryUrl,
      icon: input.icon || "grid",
      priceCredits: input.priceCredits,
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
