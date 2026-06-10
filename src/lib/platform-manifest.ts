/**
 * 平台开放接口的「单一事实来源」。
 * 同时驱动三种产物：
 *  1) 机器可读清单 JSON（GET /api/v1/manifest）—— 供 AI agent / 工具自动发现接口
 *  2) Claude-skill 风格的 SKILL.md（GET /skill）—— 供 agent 直接读取并使用
 *  3) 开发者接入页（/developer/integrate）的展示
 * 设计目标：全面、可扩展 —— 新增能力只需往 endpoints/sdkMethods 里加一条。
 */

export const SCOPES: Record<string, string> = {
  identity: "读取用户公开资料（昵称、头像、等级）",
  "achievements:write": "为用户解锁该应用的成就",
  "stats:write": "记录用户在该应用的游戏时长与统计",
  "presence:update": "更新用户「正在使用该应用」的实时状态并累计使用时长",
  "gateway:llm": "用用户在平台配置的密钥经 Gateway 调用大模型（应用拿不到明文 Key）",
};

export interface EndpointParam {
  name: string;
  in: "body" | "query";
  type: string;
  required: boolean;
  description: string;
}

export interface Endpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  /** none = 公开；app_secret = client_id+client_secret；bearer = 用户访问令牌 */
  auth: "none" | "app_secret" | "bearer";
  scope?: keyof typeof SCOPES;
  params: EndpointParam[];
  responseExample: unknown;
}

export interface SdkMethod {
  name: string;
  signature: string;
  summary: string;
}

export const ENDPOINTS: Endpoint[] = [
  {
    id: "oauth.token",
    method: "POST",
    path: "/api/v1/oauth/token",
    summary: "用授权码换取用户访问令牌（服务器到服务器）",
    auth: "app_secret",
    params: [
      { name: "client_id", in: "body", type: "string", required: true, description: "应用 client_id" },
      { name: "client_secret", in: "body", type: "string", required: true, description: "应用密钥" },
      { name: "code", in: "body", type: "string", required: true, description: "授权页返回的授权码（10 分钟内有效）" },
    ],
    responseExample: { access_token: "at_xxx", token_type: "Bearer", scope: "identity achievements:write" },
  },
  {
    id: "me.get",
    method: "GET",
    path: "/api/v1/me",
    summary: "读取当前授权用户的公开资料",
    auth: "bearer",
    scope: "identity",
    params: [],
    responseExample: { handle: "me", name: "织星者", avatarHue: 205, level: 23 },
  },
  {
    id: "achievements.list",
    method: "GET",
    path: "/api/v1/achievements",
    summary: "列出应用的成就 schema 及当前用户解锁态",
    auth: "bearer",
    params: [],
    responseExample: { achievements: [{ key: "first_win", name: "首胜", unlocked: false, rarity: 0 }] },
  },
  {
    id: "achievements.unlock",
    method: "POST",
    path: "/api/v1/achievements/unlock",
    summary: "为当前用户解锁一个成就",
    auth: "bearer",
    scope: "achievements:write",
    params: [{ name: "key", in: "body", type: "string", required: true, description: "成就 key（在开发者中心定义）" }],
    responseExample: { unlocked: true, alreadyOwned: false, name: "首胜" },
  },
  {
    id: "stats.submit",
    method: "POST",
    path: "/api/v1/stats",
    summary: "上报游戏时长与自定义统计；playtime 计入用户库时长",
    auth: "bearer",
    scope: "stats:write",
    params: [
      { name: "playtimeMinutes", in: "body", type: "number", required: false, description: "本次新增游戏时长（分钟）" },
      { name: "stats", in: "body", type: "object", required: false, description: "自定义统计键值对" },
    ],
    responseExample: { ok: true },
  },
  {
    id: "ai.chat",
    method: "POST",
    path: "/api/v1/ai/chat",
    summary: "经平台 Gateway 用用户配置的密钥调用大模型（应用不接触明文 Key）",
    auth: "bearer",
    scope: "gateway:llm",
    params: [
      { name: "prompt", in: "body", type: "string", required: true, description: "提示词" },
      { name: "provider", in: "body", type: "string", required: false, description: "anthropic|openai|… 留空用应用声明的默认 provider" },
      { name: "model", in: "body", type: "string", required: false, description: "模型 id，留空用默认" },
    ],
    responseExample: { reply: "……", provider: "anthropic", model: "claude-3-5-haiku-latest", usage: { tokensIn: 12, tokensOut: 64 } },
  },
  {
    id: "presence.heartbeat",
    method: "POST",
    path: "/api/v1/presence/heartbeat",
    summary: "上报「正在使用该应用」的心跳，刷新用户富状态并按秒累计使用时长",
    auth: "bearer",
    scope: "presence:update",
    params: [
      { name: "activity", in: "body", type: "string", required: true, description: "活动名（好友处显示为「正在使用 <activity>」）" },
      { name: "secondsActive", in: "body", type: "number", required: false, description: "距上次心跳的活跃秒数，累加进使用时长（单次上限 120s）" },
    ],
    responseExample: { ok: true },
  },
  {
    id: "stats.global",
    method: "GET",
    path: "/api/v1/stats/global",
    summary: "读取应用全站成就稀有度",
    auth: "bearer",
    params: [],
    responseExample: { owners: 1, achievements: [{ key: "first_win", unlocks: 0, rarity: 0 }] },
  },
  {
    id: "manifest",
    method: "GET",
    path: "/api/v1/manifest",
    summary: "本清单本身（接口自描述，供 agent 自动发现）",
    auth: "none",
    params: [],
    responseExample: { schema: "starport.platform/v1" },
  },
];

export const SDK_METHODS: SdkMethod[] = [
  { name: "getIdentity", signature: "starport.getIdentity(): Promise<{handle,name,avatarHue}>", summary: "获取当前用户公开身份" },
  { name: "ai.chat", signature: "starport.ai.chat(prompt: string): Promise<{reply,...}>", summary: "经平台 Gateway 用用户密钥调用大模型（应用拿不到密钥）" },
  { name: "storage.get", signature: "starport.storage.get(key): Promise<{value}>", summary: "读取应用隔离存储" },
  { name: "storage.set", signature: "starport.storage.set(key, value): Promise<void>", summary: "写入应用隔离存储" },
  { name: "achievements.unlock", signature: "starport.achievements.unlock(key): Promise<{unlocked,name}>", summary: "解锁成就（与开放 API 同一后端）" },
];

export interface Manifest {
  schema: string;
  platform: { name: string; description: string; baseUrl: string; docs: string };
  auth: {
    oauth2: { authorizeUrl: string; tokenUrl: string; flow: string; scopes: Record<string, string> };
    note: string;
  };
  endpoints: (Endpoint & { url: string })[];
  sdk: { script: string; methods: SdkMethod[] };
  skill: string;
}

/** 生成机器可读清单（baseUrl 由请求推导） */
export function buildManifest(baseUrl: string): Manifest {
  return {
    schema: "starport.platform/v1",
    platform: {
      name: "星港 StarPort",
      description: "一站式 AI 应用、模型与 Agent 平台。开发者可上架应用，并通过开放 API 读取用户公开资料、回传成就与游戏时长。",
      baseUrl,
      docs: `${baseUrl}/developer/integrate`,
    },
    auth: {
      oauth2: {
        authorizeUrl: `${baseUrl}/oauth/authorize`,
        tokenUrl: `${baseUrl}/api/v1/oauth/token`,
        flow: "authorization_code",
        scopes: SCOPES,
      },
      note: "用户态调用需 OAuth2 授权码换取 access_token，请求头 Authorization: Bearer <token>。应用密钥仅用于服务器到服务器换令牌，切勿暴露于前端。",
    },
    endpoints: ENDPOINTS.map((e) => ({ ...e, url: `${baseUrl}${e.path}` })),
    sdk: { script: `${baseUrl}/starport-sdk.js`, methods: SDK_METHODS },
    skill: `${baseUrl}/skill`,
  };
}

/** 生成 Claude-skill 风格的 SKILL.md（带 YAML frontmatter） */
export function renderSkillMarkdown(baseUrl: string): string {
  const m = buildManifest(baseUrl);
  const ep = (e: Manifest["endpoints"][number]) => {
    const params = e.params.length
      ? e.params.map((p) => `\`${p.name}\` (${p.in}, ${p.type}${p.required ? "" : "?"}) — ${p.description}`).join("\n  - ")
      : "无";
    const authText = e.auth === "none" ? "公开" : e.auth === "app_secret" ? "client_id + client_secret" : `Bearer 令牌${e.scope ? `（scope: ${e.scope}）` : ""}`;
    return `### \`${e.method} ${e.path}\` — ${e.summary}
- 鉴权：${authText}
- 参数：
  - ${params}
- 返回示例：\`${JSON.stringify(e.responseExample)}\``;
  };

  return `---
name: starport-platform
description: 用于让 AI agent 接入「星港 StarPort」平台的开放 API —— 读取用户公开资料、回传成就与游戏时长、经平台 Gateway 代理调用大模型。当开发者要把一个 web 应用或 agent 接入星港、或要为星港用户解锁成就/记录时长时使用。
metadata:
  schema: ${m.schema}
  baseUrl: ${baseUrl}
---

# 星港 StarPort 平台接入技能

${m.platform.description}

机器可读清单（可程序化枚举全部接口）：\`GET ${m.platform.baseUrl}/api/v1/manifest\`

## 接入方式（二选一）

### A. 沙箱内应用（运行在星港内的 iframe）
平台会注入 \`${m.sdk.script}\`，应用直接调用 \`window.starport\`：
${m.sdk.methods.map((s) => `- \`${s.signature}\` — ${s.summary}`).join("\n")}

### B. 外部 web 应用（部署在任意位置，服务器到服务器）
走标准 OAuth2 授权码流：
1. 引导用户到 \`${m.auth.oauth2.authorizeUrl}?client_id=<id>&scope=identity,achievements:write&redirect_uri=<回调>\`
2. 用返回的 \`code\` 调 \`POST ${m.auth.oauth2.tokenUrl}\`（带 client_id + client_secret）换 \`access_token\`
3. 之后请求带 \`Authorization: Bearer <access_token>\`

scope：
${Object.entries(m.auth.oauth2.scopes).map(([k, v]) => `- \`${k}\`：${v}`).join("\n")}

## 接口清单

${m.endpoints.map(ep).join("\n\n")}

## 给 agent 的使用要点
- 先 \`GET /api/v1/manifest\` 获取最新接口集合，不要硬编码。
- 用户态调用必须带 Bearer 令牌；缺少 scope 会返回 403 insufficient_scope。
- 应用密钥（client_secret）只在后端换令牌时使用，绝不放进浏览器或提示词。
- 成就 key 需先在开发者中心为应用定义。
`;
}
