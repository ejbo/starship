import { NextResponse } from "next/server";
import { authenticate, jsonError, requireScope } from "@/lib/api-auth";
import { GatewayError, runGatewayChat } from "@/lib/gateway-core";
import { prisma } from "@/lib/db";

/**
 * POST /api/v1/gateway/openai/chat/completions
 *
 * OpenAI 兼容的 Chat Completions 端点：原生应用（如 MultiLLM 未配自有 key 时）把它当一个
 * custom provider（baseURL=/api/v1/gateway/openai，apiKey=用户 OAuth 令牌）接入。平台据 model
 * 路由到上游、用平台 key 出账、按用量扣 gatewayTokens。鉴权：Bearer + scope gateway:llm。
 *
 * 说明：平台上游适配器目前支持 anthropic / openai；其余模型返回 400。
 */
function providerForModel(model: string): "anthropic" | "openai" | null {
  const m = (model || "").toLowerCase();
  if (m.includes("claude")) return "anthropic";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4") || m.includes("gpt")) return "openai";
  return null;
}

type Msg = { role?: string; content?: unknown };
function flatten(messages: Msg[]): string {
  const text = (c: unknown): string =>
    typeof c === "string"
      ? c
      : Array.isArray(c)
        ? c.map((x) => (typeof x === "string" ? x : ((x as { text?: string })?.text ?? ""))).join("")
        : "";
  const parts: string[] = [];
  for (const m of messages ?? []) {
    const t = text(m.content).trim();
    if (!t) continue;
    if (m.role === "assistant") parts.push(`Assistant: ${t}`);
    else if (m.role === "system") parts.push(t);
    else parts.push(`User: ${t}`);
  }
  return parts.join("\n\n");
}

function oaError(status: number, message: string, type = "invalid_request_error") {
  return NextResponse.json({ error: { message, type } }, { status });
}

export async function POST(req: Request) {
  const token = await authenticate(req);
  if (!token) return oaError(401, "缺少或无效的 access token", "invalid_request_error");
  if (!requireScope(token, "gateway:llm")) return oaError(403, "需要 gateway:llm 授权", "insufficient_scope");

  let body: { model?: string; messages?: Msg[]; stream?: boolean };
  try {
    body = await req.json();
  } catch {
    return oaError(400, "请求体需为 JSON");
  }
  const model = body.model ?? "";
  const provider = providerForModel(model);
  if (!provider) return oaError(400, `平台 Gateway 暂不支持模型 ${model}（当前支持 Claude / GPT 系列）`);
  const prompt = flatten(body.messages ?? []);
  if (!prompt) return oaError(400, "messages 为空");

  const app = await prisma.product.findUnique({ where: { id: token.productId }, select: { slug: true } });

  let res;
  try {
    res = await runGatewayChat({ userId: token.userId, provider, model, prompt, productSlug: app?.slug ?? "gateway" });
  } catch (e) {
    if (e instanceof GatewayError) return oaError(e.code === "no_credential" ? 400 : 402, e.message, e.code);
    return oaError(502, e instanceof Error ? e.message : "上游调用失败", "upstream_error");
  }

  const created = Math.floor(Date.now() / 1000);
  const usage = { prompt_tokens: res.tokensIn, completion_tokens: res.tokensOut, total_tokens: res.tokensIn + res.tokensOut };

  // 非流式：标准 chat.completion
  if (!body.stream) {
    return NextResponse.json({
      id: "chatcmpl-gw",
      object: "chat.completion",
      created,
      model: res.model,
      choices: [{ index: 0, message: { role: "assistant", content: res.text }, finish_reason: "stop" }],
      usage,
    });
  }

  // 流式：把整段结果作为一个 delta 块 + 终止块 + [DONE]（平台上游暂为单次调用）
  const enc = new TextEncoder();
  const send = (o: unknown) => enc.encode(`data: ${JSON.stringify(o)}\n\n`);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(send({ id: "chatcmpl-gw", object: "chat.completion.chunk", created, model: res.model, choices: [{ index: 0, delta: { role: "assistant", content: res.text }, finish_reason: null }] }));
      controller.enqueue(send({ id: "chatcmpl-gw", object: "chat.completion.chunk", created, model: res.model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage }));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
}
