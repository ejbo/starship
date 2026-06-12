"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getBySlug } from "@/lib/catalog";
import { setActivity } from "@/lib/friends-service";
import { acquire, isInLibrary, removeFromLibrary } from "@/lib/library-service";
import { ALL_SCOPES, issueAuthCode } from "@/lib/oauth-service";
import { markHelpful, submitReview } from "@/lib/review-service";
import { getSessionUserId } from "@/lib/session";

/**
 * 启动应用：上报「正在使用 X」富状态（含 slug，好友右键可直达商店页），返回入口与运行方式。
 *
 * 免授权直登：newtab 外部应用 + 已在库（= 用户已选择安装即视为已授权）+ 有 OAuth 凭证时，
 * 平台直接 mint 一个一次性 launch code 拼到入口 URL（指向应用的 /api/starport/launch）。
 * 应用吃下 code 即登录，**跳过 OAuth 同意页与多次重定向**（也就不会再跳到 localhost）。
 */
export async function launchAppAction(
  slug: string,
): Promise<{ ok: boolean; url?: string; launchMode?: "newtab" | "embedded"; error?: string }> {
  const product = await getBySlug(slug);
  if (!product?.entry) return { ok: false, error: "该造物没有可启动入口" };
  await setActivity(product.name, product.slug);

  let url = product.entry.url;
  if (product.entry.launchMode === "newtab") {
    try {
      const app = await prisma.product.findUnique({ where: { slug }, select: { clientId: true } });
      if (app?.clientId && (await isInLibrary(slug))) {
        const userId = await getSessionUserId();
        // 免授权启动只授「非高危」scope（排除 keys:read 明文密钥导出，仍需同意页确认）
        const code = await issueAuthCode(app.clientId, userId, [...ALL_SCOPES].filter((s) => s !== "keys:read"));
        // 补 scheme + 相对拼接（保留入口子路径，避免绝对路径丢 path / 无 scheme 抛错）
        const base = /^https?:\/\//i.test(url) ? url : `http://${url}`;
        const u = new URL("api/starport/launch", base.endsWith("/") ? base : base + "/");
        u.searchParams.set("code", code);
        url = u.toString();
      }
    } catch {
      url = product.entry.url; // 拼接/签发失败 → 退回原样入口，至少能打开
    }
  }
  return { ok: true, url, launchMode: product.entry.launchMode ?? "embedded" };
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
