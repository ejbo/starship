import { prisma } from "@/lib/db";
import { getSessionUserIdOrNull } from "@/lib/session";
import { getFriendsWithPresence } from "@/lib/friends-service";
import { activity as mockActivity, liveRoundtables } from "@/lib/mock/activity";
import { wallPosts } from "@/lib/mock/users";
import type {
  ActivityEvent,
  Friend,
  Product,
  ProductType,
  Review,
} from "@/lib/types";
import type {
  ActivityEvent as DbActivityEvent,
  Product as DbProduct,
  Review as DbReview,
} from "@prisma/client";

/**
 * 目录门面：页面只从这里取数。
 * Phase 1a 起内部实现为 Prisma 查询；presence/留言板/圆桌仍为 mock（属 Phase 2/5）。
 */

type DbProductWithReviews = DbProduct & { reviews: DbReview[] };

function toReview(r: DbReview): Review {
  return {
    id: r.id,
    author: r.authorName,
    avatarHue: r.avatarHue,
    isAgent: r.isAgent,
    score: r.score as Review["score"],
    usageHours: r.usageHours,
    helpful: r.helpful,
    body: r.body,
    date: r.date,
  };
}

function toProduct(p: DbProductWithReviews): Product {
  return {
    id: p.id,
    slug: p.slug,
    type: p.type as ProductType,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    art: {
      hueA: p.hueA,
      hueB: p.hueB,
      icon: p.icon,
      capsuleUrl: p.capsuleUrl ?? undefined,
      bannerUrl: p.bannerUrl ?? undefined,
      screenshots: p.screenshotUrls?.length ? p.screenshotUrls : undefined,
    },
    tags: p.tags,
    trailerUrl: p.trailerUrl ?? undefined,
    rating: { score: p.ratingScore, count: p.ratingCount, histogram: p.histogram },
    acquisitions: p.acquisitions,
    developer: p.developer,
    version: p.version ?? undefined,
    entry: p.entryUrl
      ? { kind: "sandbox", url: p.entryUrl, launchMode: p.launchMode === "newtab" ? "newtab" : "embedded" }
      : undefined,
    price: p.priceCredits == null ? "free" : { credits: p.priceCredits },
    capabilities: p.capabilities,
    releasedAt: p.releasedAt,
    updatedAt: p.updatedAt,
    featured: p.featured,
    reviews: p.reviews.map(toReview),
  };
}

const withReviews = {
  reviews: { orderBy: { helpful: "desc" } as const },
};

/** 仅已发布的应用进入商店列表 */
const PUBLISHED = { status: "published" };

export async function getAllProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ where: PUBLISHED, include: withReviews, orderBy: { acquisitions: "desc" } });
  return rows.map(toProduct);
}

export async function getFeatured(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, featured: true },
    include: withReviews,
    orderBy: { acquisitions: "desc" },
  });
  return rows.map(toProduct);
}

export async function getByType(type: ProductType): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, type },
    include: withReviews,
    orderBy: { acquisitions: "desc" },
  });
  return rows.map(toProduct);
}

export async function getBySlug(slug: string): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { slug }, include: withReviews });
  return row ? toProduct(row) : undefined;
}

/** 发现队列：未入库且评分高的产品 */
export async function getDiscoveryQueue(): Promise<Product[]> {
  const me = await getMeRecord();
  const ownedIds = me
    ? (await prisma.libraryEntry.findMany({ where: { userId: me.id }, select: { productId: true } })).map(
        (e) => e.productId,
      )
    : [];
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, id: { notIn: ownedIds } },
    include: withReviews,
    orderBy: { ratingScore: "desc" },
  });
  return rows.map(toProduct);
}

export interface LibraryItem {
  product: Product;
  acquiredAt: string;
  lastUsedAt?: string;
  usageHours: number;
  usageMinutes: number;
}

async function getMeRecord() {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const me = await getMeRecord();
  if (!me) return [];
  const entries = await prisma.libraryEntry.findMany({
    where: { userId: me.id },
    include: { product: { include: withReviews } },
    orderBy: { lastUsedAt: "desc" },
  });
  return entries.map((e) => ({
    product: toProduct(e.product),
    acquiredAt: e.acquiredAt,
    lastUsedAt: e.lastUsedAt ?? undefined,
    usageHours: e.usageHours,
    usageMinutes: e.usageMinutes,
  }));
}

export interface CurrentUserView {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  level: number;
  signature: string;
  badges: { label: string; icon: string }[];
  showcase: string[];
  tokenBalance: string;
  credits: number;
  library: { slug: string; acquiredAt: string; lastUsedAt?: string; usageHours: number; usageMinutes: number }[];
}

/** 未登录返回 null */
export async function getCurrentUser(): Promise<CurrentUserView | null> {
  const userId = await getSessionUserIdOrNull();
  if (!userId) return null;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { library: { include: { product: { select: { slug: true } } } } },
  });
  if (!me) return null;
  return {
    handle: me.handle,
    name: me.name,
    avatarHue: me.avatarHue,
    avatarUrl: me.avatarUrl,
    level: me.level,
    signature: me.signature,
    badges: (me.badges as { label: string; icon: string }[]) ?? [],
    showcase: me.showcase,
    tokenBalance: me.tokenBalance,
    credits: me.credits,
    library: me.library
      .map((e) => ({
        slug: e.product.slug,
        acquiredAt: e.acquiredAt,
        lastUsedAt: e.lastUsedAt ?? undefined,
        usageHours: e.usageHours,
        usageMinutes: e.usageMinutes,
      }))
      .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "")),
  };
}

/** 好友列表（含真实在线状态）。委托 friends-service。 */
export function getFriends(): Promise<Friend[]> {
  return getFriendsWithPresence();
}

export async function getFeed(): Promise<ActivityEvent[]> {
  const rows = await prisma.activityEvent.findMany({ orderBy: { sort: "asc" } });
  return rows.map(toActivity);
}

function toActivity(e: DbActivityEvent): ActivityEvent {
  return {
    id: e.id,
    actor: { name: e.actorName, avatarHue: e.actorHue, isAgent: e.actorIsAgent },
    verb: e.verb as ActivityEvent["verb"],
    productSlug: e.productSlug ?? undefined,
    detail: e.detail ?? undefined,
    at: e.at,
  };
}

export function getWallPosts() {
  return wallPosts;
}

export function getLiveRoundtables() {
  return liveRoundtables;
}

// mockActivity 仅作类型完整性参考，避免误删 mock 文件依赖
void mockActivity;

/** 运行要求声明 → 人话 */
export function describeCapability(cap: string): { name: string; note: string } {
  const [kind, value] = cap.split(":");
  switch (kind) {
    case "llm":
      return value === "any"
        ? { name: "任意大模型", note: "使用你在配置中心授权的任一模型" }
        : { name: `${providerName(value)} API`, note: "可直接使用你的星港配置，无需单独填 Key" };
    case "gateway":
      return value === "usage-read"
        ? { name: "用量数据（只读）", note: "读取你的 Gateway 用量记录" }
        : { name: `${providerName(value)} 接入`, note: "经平台 Gateway 代理调用" };
    case "storage":
      return { name: `云存储 ${value.toUpperCase()}`, note: "应用专属的隔离存储空间" };
    case "social":
      return { name: "好友列表", note: "经你授权后可读取好友与邀请协作" };
    case "agents":
      return { name: "Agent 邀请", note: "可邀请你和好友的 Agent 入席" };
    case "web":
      return { name: value === "search" ? "网页检索" : "网页抓取", note: "经平台代理的联网能力" };
    default:
      return { name: cap, note: "" };
  }
}

function providerName(value: string): string {
  const names: Record<string, string> = {
    claude: "Claude",
    anthropic: "Anthropic",
    openai: "OpenAI",
    gemini: "Gemini",
    xai: "xAI",
    openrouter: "OpenRouter",
  };
  return names[value] ?? value;
}
