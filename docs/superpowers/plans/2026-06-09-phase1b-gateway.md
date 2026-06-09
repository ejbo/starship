# Phase 1b AI Gateway 配置中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。

**Goal:** 落地平台头牌能力「配置一次、全平台应用通用」：API 配置中心（增删密钥、加密落库、日限额）+ 用量看板（按应用/Provider 拆解），并在配置中心展示「平台应用需要的 Provider 及配置状态」。

**Architecture:** 新增 ApiCredential / UsageRecord 表与 src/lib/crypto.ts（AES-256-GCM 信封加密，密钥来自 env STARPORT_SECRET）。当前会话用户为种子 me（src/lib/session.ts 占位，Phase 1b-auth 替换为 iron-session）。写路径用 Server Actions + revalidatePath。/settings/* 强制 dynamic。原始 Key 永不下发前端：表单提交即加密，列表只展示 provider/label/末4位。

### Task 1: 加密与会话占位
- [ ] crypto.ts：encryptSecret/decryptSecret（aes-256-gcm，格式 base64(iv).base64(tag).base64(cipher)），last4()
- [ ] session.ts：getSessionUserId()→ 查 handle="me" 的 id（占位）
- [ ] env：STARPORT_SECRET 写入 .env；.env.example 文档化；env 校验在 crypto.ts 内（缺失则报错）
- [ ] 用 tsx 一次性脚本验证 encrypt→decrypt 往返一致（验证后删除脚本）

### Task 2: Schema + 迁移 + 种子
- [ ] schema：ApiCredential（userId/provider/label/ciphertext/last4/dailyTokenLimit?/createdAt，@@unique[userId,provider,label]）、UsageRecord（userId/productSlug/provider/model/tokensIn/tokensOut/costCents/day）
- [ ] migrate dev --name gateway
- [ ] seed.ts 追加：me 的 2 个已配置密钥（anthropic/openai，假明文加密入库）+ 一批 UsageRecord（覆盖多个 app/provider/day）

### Task 3: 配置中心 /settings/gateway
- [ ] gateway-service.ts：listCredentials/addCredential/deleteCredential（Server Actions）、getProviderCoverage()（聚合 catalog capabilities → 各 provider 是否已配置）
- [ ] 页面：已配置密钥列表（provider 图标/label/末4位/日限额/删除）+ 添加表单（provider 下拉/label/key/日限额）+ 「平台应用需要的 Provider」覆盖卡（已配置✓/未配置 去配置）
- [ ] provider 元数据（名称/图标/颜色）集中在 lib/providers.ts

### Task 4: 用量看板 /settings/usage + 导航接线 + 终验
- [ ] usage-service.ts：本期总量、按应用聚合、按 provider 聚合、最近记录
- [ ] 页面：总量卡 + 按应用条形 + 按 Provider 条形 + 最近记录表
- [ ] 导航：token pill → /settings/usage；新增齿轮 → /settings/gateway
- [ ] build + curl(/settings/gateway,/settings/usage) + 提交一条密钥的 server action 冒烟 → commit → 合并 main
