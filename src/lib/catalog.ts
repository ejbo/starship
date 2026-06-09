import { products } from "@/lib/mock/products";
import { activity, liveRoundtables } from "@/lib/mock/activity";
import { currentUser, friends, wallPosts } from "@/lib/mock/users";
import type { ActivityEvent, Friend, Product, ProductType } from "@/lib/types";

/**
 * 目录门面：页面只从这里取数。
 * Phase 1 把内部实现换成 Prisma 查询，页面零改动。
 */

export function getAllProducts(): Product[] {
  return products;
}

export function getFeatured(): Product[] {
  return products.filter((p) => p.featured);
}

export function getByType(type: ProductType): Product[] {
  return products.filter((p) => p.type === type);
}

export function getBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** 发现队列：未入库且评分高的造物 */
export function getDiscoveryQueue(): Product[] {
  const owned = new Set(currentUser.library.map((e) => e.slug));
  return products
    .filter((p) => !owned.has(p.slug))
    .sort((a, b) => b.rating.score - a.rating.score);
}

export interface LibraryItem {
  product: Product;
  acquiredAt: string;
  lastUsedAt?: string;
  usageHours: number;
}

export function getLibrary(): LibraryItem[] {
  return currentUser.library
    .map((entry) => {
      const product = getBySlug(entry.slug);
      return product ? { product, ...entry } : null;
    })
    .filter((item): item is LibraryItem & { slug: string } => item !== null)
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""));
}

export function getCurrentUser() {
  return currentUser;
}

export function getFriends(): Friend[] {
  return friends;
}

export function getFeed(): ActivityEvent[] {
  return activity;
}

export function getWallPosts() {
  return wallPosts;
}

export function getLiveRoundtables() {
  return liveRoundtables;
}

/** 运行环境声明 → 人话 */
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
        : { name: `${providerName(value)} 接入`, note: "经星港 Gateway 代理调用" };
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
