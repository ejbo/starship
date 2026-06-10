import { NextResponse } from "next/server";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { GatewayError, runGatewayChat } from "@/lib/gateway-core";
import { capabilityProvider } from "@/lib/providers";
import { prisma } from "@/lib/db";

/**
 * POST /api/v1/ai/chat —— 外部应用经平台 Gateway 用「用户在平台配置的密钥」调用大模型。
 * 这就是"配置一次、全平台应用通用"对外部 web 应用的落地：应用拿不到明文 Key。
 * 鉴权：Bearer 令牌 + scope gateway:llm（授权页同意即代表"允许用我的平台密钥"）。
 * body: { provider?, model?, prompt }
 */
export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "gateway:llm")) return jsonError(403, "insufficient_scope", "需要 gateway:llm 授权");

  let body: { provider?: string; model?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }
  if (!body.prompt) return jsonError(400, "invalid_request", "缺少 prompt");

  // provider：显式指定，否则取该应用声明的首个 LLM 能力
  let provider = body.provider;
  if (!provider) {
    const app = await prisma.product.findUnique({ where: { id: token.productId }, select: { capabilities: true, slug: true } });
    provider = app?.capabilities.map(capabilityProvider).find((p): p is string => Boolean(p)) ?? "anthropic";
  }
  const app = await prisma.product.findUnique({ where: { id: token.productId }, select: { slug: true } });

  try {
    const res = await runGatewayChat({ userId: token.userId, provider, model: body.model, prompt: body.prompt, productSlug: app?.slug ?? "external" });
    return NextResponse.json({
      reply: res.text,
      provider: res.provider,
      model: res.model,
      usage: { tokensIn: res.tokensIn, tokensOut: res.tokensOut },
    });
  } catch (e) {
    if (e instanceof GatewayError) return jsonError(e.code === "no_credential" ? 400 : 402, e.code, e.message);
    return jsonError(502, "upstream_error", e instanceof Error ? e.message : undefined);
  }
}
