import "server-only";

/** 网关直连各 provider 的 REST（Gateway 即代理，无需厂商 SDK） */

export interface AdapterResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

// 默认模型（请求未显式带 model 时用；取各家便宜可用的一档，均已对账号实测可用 2026-06）
export const defaultModel: Record<string, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-5-mini",
  google: "gemini-2.5-flash",
  xai: "grok-4.20-0309-non-reasoning",
  deepseek: "deepseek-chat",
  zhipu: "glm-4-flash",
  qwen: "qwen-plus",
};

const TIMEOUT_MS = 30_000;

function withTimeout(): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  return { signal: ctrl.signal, cancel: () => clearTimeout(t) };
}

export async function callAnthropic(key: string, model: string, prompt: string): Promise<AdapterResult> {
  const { signal, cancel } = withTimeout();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    const text = (data.content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
    return {
      text,
      tokensIn: data.usage?.input_tokens ?? 0,
      tokensOut: data.usage?.output_tokens ?? 0,
      model: data.model ?? model,
    };
  } finally {
    cancel();
  }
}

/**
 * OpenAI 兼容的 /chat/completions 通用调用：OpenAI、Gemini（v1beta/openai）、xAI 均走此格式。
 * baseUrl 不含末尾斜杠，会自动拼 /chat/completions。
 */
async function callOpenAICompatible(baseUrl: string, key: string, model: string, prompt: string): Promise<AdapterResult> {
  const { signal, cancel } = withTimeout();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      signal,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      text,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
      model: data.model ?? model,
    };
  } finally {
    cancel();
  }
}

export function callOpenAI(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://api.openai.com/v1", key, model, prompt);
}

/** Gemini：用 Google 的 OpenAI 兼容端点（实测返回 OpenAI 格式 + usage） */
export function callGoogle(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://generativelanguage.googleapis.com/v1beta/openai", key, model, prompt);
}

/** xAI Grok：原生 OpenAI 兼容 */
export function callXai(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://api.x.ai/v1", key, model, prompt);
}

/** DeepSeek：原生 OpenAI 兼容 */
export function callDeepseek(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://api.deepseek.com/v1", key, model, prompt);
}

/** 智谱 GLM：OpenAI 兼容端点（paas/v4） */
export function callZhipu(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://open.bigmodel.cn/api/paas/v4", key, model, prompt);
}

/** 通义千问 Qwen：阿里云 DashScope 的 OpenAI 兼容端点 */
export function callQwen(key: string, model: string, prompt: string): Promise<AdapterResult> {
  return callOpenAICompatible("https://dashscope.aliyuncs.com/compatible-mode/v1", key, model, prompt);
}

/** provider → 适配器；未实现的 provider 抛错由上层降级 */
export async function callProvider(provider: string, key: string, model: string, prompt: string): Promise<AdapterResult> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(key, model, prompt);
    case "openai":
      return callOpenAI(key, model, prompt);
    case "google":
      return callGoogle(key, model, prompt);
    case "xai":
      return callXai(key, model, prompt);
    case "deepseek":
      return callDeepseek(key, model, prompt);
    case "zhipu":
      return callZhipu(key, model, prompt);
    case "qwen":
      return callQwen(key, model, prompt);
    default:
      throw new Error(`provider ${provider} 暂未接入真实调用`);
  }
}
