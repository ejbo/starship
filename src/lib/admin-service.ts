import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUserIdOrNull } from "@/lib/session";

/** 当前用户是管理员则返回其 id，否则 null */
export async function getAdminUserId(): Promise<string | null> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return null;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return u?.isAdmin ? userId : null;
}

/** 网关：非管理员直接踢回首页 */
export async function requireAdmin(): Promise<string> {
  const id = await getAdminUserId();
  if (!id) redirect("/");
  return id;
}

// ============ 产品 ============

export async function listAllProductsAdmin() {
  return prisma.product.findMany({
    orderBy: [{ featured: "desc" }, { status: "asc" }, { acquisitions: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      status: true,
      featured: true,
      developer: true,
      acquisitions: true,
      ratingScore: true,
      ratingCount: true,
      priceCredits: true,
      capsuleUrl: true,
      bannerUrl: true,
      hueA: true,
      hueB: true,
      icon: true,
    },
  });
}

export async function setProductPublished(id: string, published: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { status: published ? "published" : "draft" } });
}

export async function setProductFeatured(id: string, featured: boolean) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { featured } });
}

export async function getProductForEdit(id: string) {
  await requireAdmin();
  return prisma.product.findUnique({ where: { id } });
}

export interface AdminProductInput {
  name: string;
  tagline: string;
  developer: string;
  version: string | null;
  type: string;
  description: string[];
  tags: string[];
  capabilities: string[];
  priceCredits: number | null;
  icon: string;
  hueA: number;
  hueB: number;
  capsuleUrl: string | null;
  bannerUrl: string | null;
  screenshotUrls: string[];
  trailerUrl: string | null;
  launchMode: string;
  entryUrl: string | null;
  status: string;
  featured: boolean;
}

export async function updateProductAdmin(id: string, input: AdminProductInput) {
  await requireAdmin();
  await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      tagline: input.tagline,
      developer: input.developer,
      version: input.version,
      type: input.type as never,
      description: input.description,
      tags: input.tags,
      capabilities: input.capabilities,
      priceCredits: input.priceCredits,
      icon: input.icon,
      hueA: input.hueA,
      hueB: input.hueB,
      capsuleUrl: input.capsuleUrl,
      bannerUrl: input.bannerUrl,
      screenshotUrls: input.screenshotUrls,
      trailerUrl: input.trailerUrl,
      launchMode: input.launchMode,
      entryUrl: input.entryUrl,
      status: input.status,
      featured: input.featured,
    },
  });
}

// ============ Banner ============

export async function listBannersAdmin() {
  await requireAdmin();
  return prisma.banner.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "desc" }] });
}

export interface BannerInput {
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  href: string;
  active: boolean;
  sort: number;
}

export async function createBanner(input: BannerInput) {
  await requireAdmin();
  await prisma.banner.create({ data: { ...input, createdAt: new Date().toISOString() } });
}

export async function updateBanner(id: string, input: BannerInput) {
  await requireAdmin();
  await prisma.banner.update({ where: { id }, data: input });
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  await prisma.banner.delete({ where: { id } });
}

/** 首页用（无需管理员）：取启用中的 banner */
export async function getActiveBanners() {
  return prisma.banner.findMany({ where: { active: true }, orderBy: { sort: "asc" } });
}
