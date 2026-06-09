"use server";

import { revalidatePath } from "next/cache";
import { acquire, removeFromLibrary } from "@/lib/library-service";
import { submitReview } from "@/lib/review-service";

export async function acquireAction(slug: string) {
  await acquire(slug);
  revalidatePath(`/p/${slug}`);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function removeAction(slug: string) {
  await removeFromLibrary(slug);
  revalidatePath(`/p/${slug}`);
  revalidatePath("/library");
  revalidatePath("/");
}

export async function submitReviewAction(slug: string, formData: FormData) {
  const score = Number(formData.get("score") ?? 5);
  const body = String(formData.get("body") ?? "");
  await submitReview(slug, score, body);
  revalidatePath(`/p/${slug}`);
}
