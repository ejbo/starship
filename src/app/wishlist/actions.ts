"use server";
import { revalidatePath } from "next/cache";
import { addToWishlist, removeFromWishlist } from "@/lib/wishlist-service";

export async function addWishlistAction(slug: string) {
  await addToWishlist(slug);
  revalidatePath("/wishlist");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/", "layout");
}

export async function removeWishlistAction(slug: string) {
  await removeFromWishlist(slug);
  revalidatePath("/wishlist");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/", "layout");
}
