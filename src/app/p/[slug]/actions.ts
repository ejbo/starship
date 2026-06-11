"use server";

import { revalidatePath } from "next/cache";
import { getBySlug } from "@/lib/catalog";
import { setActivity } from "@/lib/friends-service";
import { acquire, removeFromLibrary } from "@/lib/library-service";
import { markHelpful, submitReview } from "@/lib/review-service";

/**
 * 启动应用：上报「正在使用 X」富状态（含 slug，好友右键可直达商店页），
 * 返回入口与运行方式。newtab 应用据此前端直接开新标签页，免去 /run 中转页。
 */
export async function launchAppAction(
  slug: string,
): Promise<{ ok: boolean; url?: string; launchMode?: "newtab" | "embedded"; error?: string }> {
  const product = await getBySlug(slug);
  if (!product?.entry) return { ok: false, error: "该造物没有可启动入口" };
  await setActivity(product.name, product.slug);
  return { ok: true, url: product.entry.url, launchMode: product.entry.launchMode ?? "embedded" };
}

export async function acquireAction(slug: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await acquire(slug);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "获取失败" };
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath("/library");
  revalidatePath("/");
  return { ok: true };
}

export async function removeAction(slug: string) {
  await removeFromLibrary(slug);
  revalidatePath(`/p/${slug}`);
  revalidatePath("/library");
  revalidatePath("/");
}

/** recommend: "yes" 推荐 → 5 星；"no" 不推荐 → 2 星 */
export async function submitReviewAction(slug: string, formData: FormData) {
  const recommend = String(formData.get("recommend") ?? "yes") === "yes";
  const body = String(formData.get("body") ?? "");
  await submitReview(slug, recommend ? 5 : 2, body);
  revalidatePath(`/p/${slug}`);
}

export async function markHelpfulAction(reviewId: string): Promise<number> {
  const res = await markHelpful(reviewId);
  return res.helpful;
}
