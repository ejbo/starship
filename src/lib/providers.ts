/** Provider 元数据：配置中心与覆盖卡共用 */
export interface ProviderMeta {
  id: string;
  name: string;
  /** lucide 图标名（见 lib/icons.ts） */
  icon: string;
  hue: number;
  keyHint: string;
}

export const providers: ProviderMeta[] = [
  { id: "anthropic", name: "Anthropic Claude", icon: "sparkles", hue: 18, keyHint: "sk-ant-..." },
  { id: "openai", name: "OpenAI", icon: "cpu", hue: 160, keyHint: "sk-..." },
  { id: "google", name: "Google Gemini", icon: "radar", hue: 210, keyHint: "AIza..." },
  { id: "xai", name: "xAI Grok", icon: "braces", hue: 280, keyHint: "xai-..." },
  { id: "openrouter", name: "OpenRouter", icon: "globe", hue: 320, keyHint: "sk-or-..." },
];

export function providerMeta(id: string): ProviderMeta {
  return providers.find((p) => p.id === id) ?? { id, name: id, icon: "sparkles", hue: 0, keyHint: "" };
}

/** 把产品 capability 映射到所需 provider（无法判定具体 provider 的返回 null） */
export function capabilityProvider(cap: string): string | null {
  const [kind, value] = cap.split(":");
  if (kind === "gateway") {
    if (value === "anthropic") return "anthropic";
    if (value === "openrouter") return "openrouter";
    return null;
  }
  if (kind === "llm") {
    const map: Record<string, string> = {
      claude: "anthropic",
      openai: "openai",
      gemini: "google",
      xai: "xai",
    };
    return map[value] ?? null; // llm:any 等返回 null
  }
  return null;
}
