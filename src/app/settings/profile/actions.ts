"use server";

import { revalidatePath } from "next/cache";
import { updateProfile } from "@/lib/profile-service";

export interface ProfileSaveResult {
  ok: boolean;
  error?: string;
}

export async function updateProfileAction(formData: FormData): Promise<ProfileSaveResult> {
  try {
    await updateProfile({
      name: String(formData.get("name") ?? ""),
      signature: String(formData.get("signature") ?? ""),
      avatarHue: Number(formData.get("avatarHue") ?? 210),
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
  revalidatePath("/settings/profile");
  revalidatePath("/u/me");
  return { ok: true };
}
