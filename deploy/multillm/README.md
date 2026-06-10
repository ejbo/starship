# MultiLLM · 星港版

专为接入「星港 StarPort」做的精简多模型对比应用。从原 multillm-chat 提炼出核心（一个问题、多模型并排作答），并改造成 **StarPort 原生**：

- **用星港账号登录**（OAuth2 授权码流）
- **所有 AI 调用走星港 Gateway**，用「用户在星港平台配置的密钥」—— 本应用不存、不碰任何明文 API Key
- 零第三方依赖，单文件，一键启动

## 启动

```bash
node server.mjs
```

默认跑在 **http://localhost:4000**。可用环境变量调整：

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | 4000 | 本应用端口 |
| `STARPORT_BASE` | http://localhost:3000 | 你的星港地址 |
| `CLIENT_ID` | app_multillm | 星港里这个应用的 client_id |
| `CLIENT_SECRET` | sk_app_multillm_demo | 对应密钥 |
| `SELF_BASE` | http://localhost:4000 | 本应用对外地址（OAuth 回调用）|

## 完整 demo 流程

1. 启动星港（在 social-plat 项目里 `pnpm dev`，默认 3000）。
2. 启动本应用 `node server.mjs`（4000）。
3. 在星港里：库/商店打开 **MultiLLM Chat** → 「在新标签页打开应用」（入口已配为 localhost:4000）。
4. 本应用提示「用星港账号登录」→ OAuth 授权（勾选 gateway:llm = 允许用平台密钥）→ 回到本应用。
5. 输入问题、勾选模型、并排发送 —— 调用经星港 Gateway 用你的平台密钥。

> 注：要得到真实回复，需在星港「API 配置中心」填入真实的 Anthropic/OpenAI 密钥；
> 用种子里的演示假 key 会收到上游「invalid x-api-key」提示（说明链路已通，只是 key 是假的）。
> 目前 Gateway 真实适配了 anthropic / openai；google / xai 会返回「未接入」提示。
