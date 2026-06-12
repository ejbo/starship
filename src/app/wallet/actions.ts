"use server";
import { revalidatePath } from "next/cache";
import { exchangeTokens, topUp } from "@/lib/credits-service";

export async function topUpAction(credits: number, method: string) {
  const { balance } = await topUp(credits, method);
  revalidatePath("/wallet");
  revalidatePath("/", "layout"); // 刷新导航里的余额
  return { balance };
}

export async function exchangeTokensAction(
  credits: number,
): Promise<{ ok: boolean; credits?: number; gatewayTokens?: number; added?: number; error?: string }> {
  try {
    const res = await exchangeTokens(credits);
    revalidatePath("/wallet");
    revalidatePath("/", "layout");
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "兑换失败" };
  }
}
