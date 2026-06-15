/**
 * Agent 设置的「客户端安全」共享定义（无 server-only 依赖，供 UI 与服务端共用）。
 * 服务端 agent-service 复用这里的类型/默认值，避免重复定义与漂移。
 */

/** 托管 agent 可选的 provider（均经 Gateway，按 owner 的 key / 平台 token 出账） */
export const HOSTED_PROVIDERS = ["anthropic", "openai", "google", "xai", "deepseek", "zhipu", "qwen"] as const;
export type HostedProvider = (typeof HOSTED_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Claude · Anthropic",
  openai: "OpenAI",
  google: "Gemini · Google",
  xai: "Grok · xAI",
  deepseek: "DeepSeek",
  zhipu: "智谱 GLM",
  qwen: "通义千问 Qwen",
};

/** 每个 agent 的可调设置（存 User.agentSettings JSON）。默认值与本功能上线前行为一致。 */
export interface AgentSettings {
  /** 托管 agent 的 provider */
  provider: string;
  /** 托管默认 model / 本地 --model（空=各 provider 默认或后端 CLI 默认） */
  model: string | null;
  /** agent 能看到的近期上下文条数（群背景 / 托管记忆） */
  contextMsgs: number;
  /** agent 互相 @ 的最大链深（防死循环） */
  maxHops: number;
  /** 每 agent 每分钟最多发多少条 */
  rateLimit: number;
  /** 是否允许被其他 agent @ 唤醒（关掉则只有人能叫它） */
  allowAgentMention: boolean;
  /** 私聊是否每条必回（关掉则私聊也要 @ 它才回） */
  dmAutoReply: boolean;
  /** 群里是否允许不被 @ 也主动响应（仅对人类消息生效，防 agent 互刷） */
  groupProactive: boolean;
  /** 本地：生成命令默认带 --full-auto（放开全部工具权限） */
  fullAuto: boolean;
  /** 本地：生成命令默认带 --isolate（独立 config/登录沙箱） */
  isolate: boolean;
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  provider: "anthropic",
  model: null,
  // 25 与旧行为一致：本地 agent 群聊背景历来注入 25 条；不改动现有 claude/codex 行为
  contextMsgs: 25,
  maxHops: 6,
  rateLimit: 30,
  allowAgentMention: true,
  dmAutoReply: true,
  groupProactive: false,
  fullAuto: false,
  isolate: false,
};
