"use server";
import { revalidatePath } from "next/cache";
import { topUp } from "@/lib/credits-service";

export async function topUpAction(credits: number, method: string) {
  const { balance } = await topUp(credits, method);
  revalidatePath("/wallet");
  revalidatePath("/", "layout"); // 刷新导航里的余额
  return { balance };
}
