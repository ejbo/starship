"use server";
import { revalidatePath } from "next/cache";
import {
  createBanner,
  deleteBanner,
  setProductFeatured,
  setProductPublished,
  updateBanner,
  updateProductAdmin,
  type AdminProductInput,
  type BannerInput,
} from "@/lib/admin-service";

export async function togglePublishedAction(id: string, published: boolean) {
  await setProductPublished(id, published);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleFeaturedAction(id: string, featured: boolean) {
  await setProductFeatured(id, featured);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveProductAction(id: string, input: AdminProductInput) {
  await updateProductAdmin(id, input);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath(`/admin/products/${id}`);
}

export async function createBannerAction(input: BannerInput) {
  await createBanner(input);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function updateBannerAction(id: string, input: BannerInput) {
  await updateBanner(id, input);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function deleteBannerAction(id: string) {
  await deleteBanner(id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
}
