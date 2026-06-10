"use server";

import { revalidatePath } from "next/cache";
import { acquire, removeFromLibrary } from "@/lib/library-service";
import { markHelpful, submitReview } from "@/lib/review-service";

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
