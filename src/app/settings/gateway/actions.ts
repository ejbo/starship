"use server";

import { revalidatePath } from "next/cache";
import { addCredential, deleteCredential } from "@/lib/gateway-service";

export async function addCredentialAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "");
  const label = String(formData.get("label") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const limitRaw = String(formData.get("dailyTokenLimit") ?? "").trim();
  const dailyTokenLimit = limitRaw ? Math.max(0, Number(limitRaw)) || null : null;

  await addCredential({ provider, label, secret, dailyTokenLimit });
  revalidatePath("/settings/gateway");
}

export async function deleteCredentialAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteCredential(id);
    revalidatePath("/settings/gateway");
  }
}
