import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { decryptSecret } from "@/lib/crypto";

/**
 * GET /api/v1/keys  （scope: keys:read）
 *
 * 返回当前用户在星港「配置中心」保存的 API 密钥【明文】，供已授权应用一键导入到其自有配置，
 * 用户无需在每个应用里重复填 key。
 *
 * 安全：这是**明文密钥离开平台**的唯一出口——仅当用户在 OAuth 同意页显式勾选并授予
 * keys:read 后，该应用的令牌才能取到。默认的 gateway:llm 路线（密钥不出平台、经 Gateway 代理）
 * 仍是更安全的选择；keys:read 面向「自带 provider、必须拿到原始 key」的应用（如完整版 multillm）。
 *
 * 响应：{ keys: [{ provider, label, last4, secret }] }（按 provider 去重，取最早配置的一把）
 */
export async function GET(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "keys:read")) {
    return jsonError(403, "insufficient_scope", "需要 keys:read 授权");
  }

  const creds = await prisma.apiCredential.findMany({
    where: { userId: token.userId },
    select: { provider: true, label: true, ciphertext: true, last4: true },
    orderBy: { createdAt: "asc" },
  });

  const seen = new Set<string>();
  const keys: { provider: string; label: string; last4: string; secret: string }[] = [];
  for (const c of creds) {
    if (seen.has(c.provider)) continue; // 每个 provider 取最早的一把，简化导入
    let secret: string;
    try {
      secret = decryptSecret(c.ciphertext);
    } catch {
      continue; // 密文损坏/密钥轮换：跳过而非整体失败
    }
    seen.add(c.provider);
    keys.push({ provider: c.provider, label: c.label, last4: c.last4, secret });
  }

  return NextResponse.json({ keys });
}
