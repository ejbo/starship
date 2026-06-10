# Phase 7 AI Gateway 实联 Implementation Plan

> 让网关真正用用户密钥调用大模型，强制日限额，按真实 token 计量；配置中心加 Playground。

**Goal:** Gateway 从"模拟响应"升级为真实代理：解密用户密钥 → 检查日限额 → 调 provider（直连 REST）→ 按真实用量计费记录 → 返回结果；演示密钥/网络失败优雅降级。沙箱 SDK ai.chat 走同一核心。

**Architecture:** 新增 `gateway-core.ts`（provider 无关的编排）+ `provider-adapters.ts`（Anthropic/OpenAI 直连 fetch）。日限额用今日 UsageRecord 聚合对比 ApiCredential.dailyTokenLimit。runtime-service.sdkChat 改调 gateway-core。配置中心加 Playground（Server Action → gateway-core）。

### Task 1: gateway-core + provider 适配器
- [ ] provider-adapters.ts：callAnthropic/callOpenAI（fetch，返回 {text, tokensIn, tokensOut}），默认模型可配
- [ ] gateway-core.ts：runGatewayChat({userId,provider,model?,prompt,productSlug})
  - 找凭证→无则 GatewayError('no_credential')
  - 日限额：今日该 provider 的 UsageRecord tokens 和 ≥ dailyTokenLimit → GatewayError('limit_exceeded')
  - 调适配器（try/catch：演示密钥/网络失败 → GatewayError('upstream' + 友好信息)）
  - 成功：UsageRecord 记真实 tokens + 估算成本；返回 {text, model, provider, tokensIn, tokensOut}
- [ ] GatewayError 带 code，调用方据此给用户文案

### Task 2: 接入 sdkChat + Playground
- [ ] runtime-service.sdkChat 改调 runGatewayChat（保留 ChatResult 形状，失败回友好 reply）
- [ ] gateway-actions：playgroundChatAction(provider, model, prompt) → 结构化结果/错误
- [ ] 配置中心加 Playground 卡（选 provider、输入 prompt、显示回复 + 真实 token 用量 / 限额提示）

### Task 3: 验收合并
- [ ] build + 单测式验证（node）：日限额拦截、无凭证、真实 tokens 记录、演示密钥优雅降级
- [ ] 合并 main
