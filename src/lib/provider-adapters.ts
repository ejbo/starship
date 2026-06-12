import "server-only";

/** 网关直连各 provider 的 REST（Gateway 即代理，无需厂商 SDK） */

export interface AdapterResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export const defaultModel: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o-mini",
  google: "gemini-1.5-flash",
  xai: "grok-2-latest",
  openrouter: "anthropic/claude-3.5-haiku",
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
        max_tokens: 1024,
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

export async function callOpenAI(key: string, model: string, prompt: string): Promise<AdapterResult> {
  const { signal, cancel } = withTimeout();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

/** provider → 适配器；未实现的 provider 抛错由上层降级 */
export async function callProvider(provider: string, key: string, model: string, prompt: string): Promise<AdapterResult> {
  switch (provider) {
    case "anthropic":
      return callAnthropic(key, model, prompt);
    case "openai":
      return callOpenAI(key, model, prompt);
    default:
      throw new Error(`provider ${provider} 暂未接入真实调用`);
  }
}
