# 04 · AI Gateway 与开放生态

> 讲清楚平台最有特色的三块：① "配置一次全平台用"的 AI Gateway 是怎么代理大模型调用的；② 外部应用怎么用 OAuth 接入拿用户数据、回传成就/时长；③ 跑在平台里的应用怎么通过 SDK 安全地用平台能力。
> 涉及文件：`src/lib/gateway-core.ts`、`provider-adapters.ts`、`src/app/api/v1/*`、`src/lib/oauth-service.ts`、`public/starport-sdk.js`、`src/components/runtime/run-sandbox.tsx`。

---

## 1. AI Gateway：什么是"网关"，它解决什么

**网关（Gateway）= 中间的代理层。** 应用不直接去调 Anthropic/OpenAI，而是调平台的网关，网关用你的 Key 替它去调，再把结果转回来。

为什么要这层中间人？因为它能集中做四件应用自己做不好、也不该做的事：

1. **密钥保护**：应用永远拿不到你的明文 Key（见 [03 认证与安全](03-认证与安全.md)）。
2. **配置复用**：你配一次 Key，平台所有应用都能用——不用在每个应用里重复填。
3. **限额**：给每个 provider 设"每日 token 上限"，超了直接拦，防止某个应用半夜刷爆你的账单。
4. **计量**：每次调用按真实 token 记账，汇总成"用量看板"。

### 调用核心流程（`src/lib/gateway-core.ts`）

```ts
export async function runGatewayChat({ userId, provider, prompt, productSlug }) {
  // ① 取这个用户在该 provider 的密钥（取不到就报"未配置"）
  const cred = await prisma.apiCredential.findFirst({ where: { userId, provider } });
  if (!cred) throw new GatewayError("no_credential", "尚未配置密钥");

  // ② 日限额检查：今天这个 provider 已用的 token 总数 ≥ 上限 → 拦截
  if (cred.dailyTokenLimit != null) {
    const used = await todayTokens(userId, provider);   // 聚合今天的 UsageRecord
    if (used >= cred.dailyTokenLimit) throw new GatewayError("limit_exceeded", "已达今日额度");
  }

  // ③ 解密 Key（只在这一瞬），调真实 provider
  const key = decryptSecret(cred.ciphertext);
  const result = await callProvider(provider, key, model, prompt);  // 真实 HTTP 调用

  // ④ 按真实 token 记账，进用量看板
  await prisma.usageRecord.create({ data: { userId, productSlug, provider,
    tokensIn: result.tokensIn, tokensOut: result.tokensOut, costCents, day: today } });

  return { text: result.text, tokensIn, tokensOut, ... };
}
```

### "网关即代理"——适配器模式

网关本身不依赖各家厂商的 SDK，而是**直接用 `fetch` 调它们的 REST 接口**（`src/lib/provider-adapters.ts`）。每个 provider 一个适配器函数，统一返回 `{ text, tokensIn, tokensOut }`：

```ts
export async function callAnthropic(key, model, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", ... },
    body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  return { text: ..., tokensIn: data.usage.input_tokens, tokensOut: data.usage.output_tokens };
}
// callOpenAI 类似，但请求格式不同 → 适配器负责"抹平差异"
```

> **面试金句**：网关用**适配器模式**抹平各家大模型 API 的差异——上层 `runGatewayChat` 只管"找密钥→查限额→调用→记账"的编排，下层每个 provider 一个适配器把不同的请求/响应格式统一成 `{text, tokensIn, tokensOut}`。加新 provider 只加一个适配器，编排逻辑不动。

### 怎么验证它是"真调用"而不是假的
我用种子里的**演示假 Key** 真的发了一次请求到 `api.anthropic.com`，Anthropic 返回了 `401 invalid x-api-key`——这恰好证明：请求的 URL/header/body 格式**完全正确**（厂商解析通过了，只是拒绝了假 Key）。换成真 Key 这条完全相同的路径就会返回真实回复。演示 Key 则优雅降级成一句提示，不会崩。

---

## 2. 开放 API + OAuth2：外部应用怎么接入

上面的网关是给"跑在平台里"的应用用的。那**部署在平台外的第三方 web 应用**怎么和平台交换数据（读用户资料、回传成就和游戏时长）？答案是业界标准的 **OAuth2 授权码流 + REST API**——和"用微信/Google 登录第三方网站"是同一套。

### 什么是 OAuth2（用大白话）
你要让"某记账 App"读你的银行流水，但你**不想把银行密码给它**。OAuth 的思路：你去银行官网点"同意授权记账App读流水"，银行给记账App一个**有限权限的令牌（token）**，记账App拿令牌去读，且只能读你授权的那部分。**全程不暴露你的密码。**

星港同理：第三方应用想读你的资料、给你解锁成就，不需要你的星港密码，而是走授权流。

### 三步流程（`src/lib/oauth-service.ts` + `src/app/api/v1/oauth/token/route.ts`）

```
① 应用把你引导到星港授权页：
   GET /oauth/authorize?client_id=应用id&scope=identity,achievements:write
        ↓ 你（已登录星港）点"授权"
   星港生成一个临时"授权码 code"，重定向回应用的回调地址 ?code=xxx

② 应用在自己的服务器后台，用 code + 应用密钥换正式令牌（服务器到服务器，安全）：
   POST /api/v1/oauth/token   { client_id, client_secret, code }
        ↓ 星港校验密钥 + code 没过期
   返回 access_token

③ 应用带令牌调接口：
   GET  /api/v1/me                  → 读你的公开资料（昵称/头像/等级）
   POST /api/v1/achievements/unlock → 给你解锁一个成就  { key: "first_win" }
   POST /api/v1/stats               → 上报游戏时长       { playtimeMinutes: 30 }
   GET  /api/v1/stats/global        → 查全站成就稀有度
```

几个安全设计：
- **授权码 code 短命**（10 分钟过期、用一次作废），就算被截获也很快失效。
- **client_secret 只在"服务器到服务器"的换令牌步骤用**，不暴露在浏览器里。
- **scope（权限范围）**：令牌带着它能干什么（`identity` / `achievements:write` / `stats:write`），接口按 scope 鉴权——给你解锁成就的应用，未必能改你的时长。
- **`/api/v1/me` 只返回公开字段**（昵称、头像、等级），绝不含邮箱、密钥。

### REST 接口长什么样（`src/app/api/v1/me/route.ts`）

```ts
export async function GET(req: Request) {
  const token = await authenticate(req);                 // 解析 Authorization: Bearer
  if (!token) return jsonError(401, "invalid_token");
  if (!requireScope(token, "identity")) return jsonError(403, "insufficient_scope");
  const u = await prisma.user.findUnique({ where: { id: token.userId },
    select: { handle: true, name: true, avatarHue: true, level: true } });  // 只给公开字段
  return NextResponse.json(u);
}
```

> **面试金句**：外部应用接入我用标准 **OAuth2 授权码流**——用户在平台授权、应用拿短命 code 在后端换 access_token、之后带 token 调 REST 接口，按 scope 鉴权。这和"用 GitHub 登录"是同一套机制；好处是第三方拿到的是有限权限的令牌，永远碰不到用户密码，且用户能精确控制授权范围。

### 巧妙之处：两个接入面共用同一套后端
"跑在平台里的应用"（postMessage SDK）和"平台外的应用"（REST API）解锁成就，调的是**同一个** `unlockAchievement` 函数。就像 Steam 既有游戏内 SDK 又有 Web API，两者写到同一套成就系统。

---

## 3. App Runtime：跑在平台里的应用怎么安全用平台能力

平台上的应用是**沙箱 iframe** 加载的（应用由开发者独立部署在别处，平台只加载它的 URL）。问题来了：iframe 里的应用怎么安全地用"当前登录用户的身份、平台的 AI、存储"？

### 答案：postMessage SDK 桥（`public/starport-sdk.js` + `src/components/runtime/run-sandbox.tsx`）

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  沙箱 iframe（第三方应用）      │         │  宿主页面 RunSandbox（平台）     │
│  注入了 starport-sdk.js       │         │                              │
│                             │         │                              │
│  starport.ai.chat("你好")    │ ──────► │  收到 postMessage             │
│   （发 postMessage 请求）      │ postMsg │  → 调 Server Action 走 Gateway │
│                             │ ◄────── │  → 把结果 postMessage 回去      │
│  拿到回复（但拿不到 Key）       │         │                              │
└─────────────────────────────┘         └──────────────────────────────┘
```

- **`sandbox` 属性**：iframe 加了 `sandbox="allow-scripts allow-forms"`（注意**没给** `allow-same-origin`），让应用被当成"不透明源"——它跑得起来，但**读不到宿主的 Cookie、DOM**，只能通过 `postMessage` 这一个受控通道和平台对话。
- **postMessage RPC**：应用调 `starport.ai.chat(...)`，SDK 在底层把它变成一条 `postMessage` 发给宿主；宿主验证来源、调 Server Action（走 Gateway 解密 Key 调大模型）、再把结果 `postMessage` 回去。应用全程只看到"结果"。
- SDK 暴露的能力：`getIdentity()`（拿公开身份）、`ai.chat()`（经网关调大模型）、`storage.get/set()`（每应用隔离的存储）、`achievements.unlock()`（解锁成就）。

```js
// public/starport-sdk.js —— 应用方调用的接口，底层是 postMessage RPC
window.starport = {
  getIdentity: () => call("identity.get"),
  ai:    { chat: (prompt) => call("ai.chat", { prompt }) },
  storage: { get: (k) => call("storage.get", { key: k }), set: (k, v) => call("storage.set", { key: k, value: v }) },
  achievements: { unlock: (key) => call("achievements.unlock", { key }) },
};
```

> **面试金句**：平台内应用用 **sandbox iframe + postMessage RPC**——iframe 不给 same-origin，所以它读不到宿主 Cookie/DOM，只能通过 postMessage 这条受控通道请求能力；AI 调用经宿主转发到网关，密钥在服务端解密，应用只拿结果。这是"既让第三方应用能用平台能力、又不把用户敏感数据交给它"的标准隔离方案，和浏览器扩展、小程序的安全模型同源。

---

## 小结

- **AI Gateway**：中间代理层，集中做密钥保护、配置复用、限额、计量；适配器模式抹平各家大模型差异。
- **开放 API**：OAuth2 授权码流 + REST 接口，第三方应用拿有限权限令牌读用户数据、回传成就/时长，碰不到密码。
- **App Runtime**：sandbox iframe + postMessage SDK，平台内应用经受控通道用能力，读不到宿主敏感数据。
- **统一后端**：iframe SDK 和外部 REST API 共用同一套成就/存储/网关逻辑。
