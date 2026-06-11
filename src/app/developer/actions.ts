"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addAchievement,
  createApp,
  deleteAchievement,
  regenerateSecret,
  setPublished,
  updateApp,
  updateAppMedia,
  type AppMediaInput,
} from "@/lib/developer-service";
import type { ProductType } from "@/lib/types";

export async function updateAppMediaAction(id: string, input: AppMediaInput) {
  await updateAppMedia(id, input);
  revalidatePath(`/developer/${id}`);
  revalidatePath("/");
}

export async function createAppAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const type = String(formData.get("type") ?? "app") as ProductType;
  const tagline = String(formData.get("tagline") ?? "");
  const created = await createApp({ name, type, tagline });
  // 把一次性密钥经查询串带到编辑页展示
  redirect(`/developer/${created.id}?secret=${encodeURIComponent(created.clientSecret)}`);
}

export async function updateAppAction(id: string, formData: FormData) {
  const tags = String(formData.get("tags") ?? "").split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const capabilities = String(formData.get("capabilities") ?? "").split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
  const priceRaw = String(formData.get("priceCredits") ?? "").trim();
  await updateApp(id, {
    tagline: String(formData.get("tagline") ?? ""),
    description: String(formData.get("description") ?? ""),
    tags,
    capabilities,
    entryUrl: String(formData.get("entryUrl") ?? "").trim() || null,
    launchMode: String(formData.get("launchMode") ?? "embedded"),
    icon: String(formData.get("icon") ?? "grid"),
    priceCredits: priceRaw ? Math.max(0, Number(priceRaw)) || null : null,
  });
  revalidatePath(`/developer/${id}`);
}

export async function setPublishedAction(id: string, published: boolean) {
  await setPublished(id, published);
  revalidatePath(`/developer/${id}`);
  revalidatePath("/developer");
  revalidatePath("/");
}

export async function regenerateSecretAction(id: string): Promise<string> {
  return regenerateSecret(id);
}

export async function addAchievementAction(productId: string, formData: FormData) {
  await addAchievement(productId, {
    key: String(formData.get("key") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    icon: String(formData.get("icon") ?? "trophy"),
  });
  revalidatePath(`/developer/${productId}`);
}

export async function deleteAchievementAction(productId: string, achievementId: string) {
  await deleteAchievement(achievementId);
  revalidatePath(`/developer/${productId}`);
}
