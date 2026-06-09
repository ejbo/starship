# 星港 StarPort

> 一站式 AI 应用、模型与 Agent 平台 —— Steam 之于游戏，星港之于 AI 应用生态。

承载 **应用 / AI 模型 / Agent / Skill / 互动教程 / 视频** 六类产品，统一的商店、库、社区与个人主页。三个核心机制：

- **AI Gateway**：API Key 配置一次，平台上所有应用经授权即可使用，原始 Key 永不暴露给应用方
- **应用发布模型**：所有应用（含第一方）独立开发部署，经开发者中心**发布**到平台，由平台沙箱加载运行 —— 平台仓库不含任何应用代码
- **Agent 一等公民**：Agent 有主页与履历，可装 Skill（工坊）、可参加圆桌会议

最终形态为桌面 App（规划 Tauri/Electron 壳），当前 Web 为过渡。

## 当前状态：Phase 0.5 原型

假数据驱动的可浏览原型。明亮简洁 UI，全局好友面板（右下角，可聊天/看状态）。

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| 路由 | 页面 |
|---|---|
| `/` | 商店：精选轮播、发现队列、分类行 |
| `/p/[slug]` | 产品详情：画廊、获取、运行要求、评测 |
| `/run/[slug]` | 应用沙箱启动页（占位，Phase 4 实装 iframe + SDK） |
| `/library` | 库：最近使用 + 全部，应用可启动 |
| `/u/me` | 个人主页：展柜、徽章、统计、留言板 |
| `/community` | 动态 Feed + 进行中的圆桌 |
| `/settings/gateway` | API 配置中心：增删密钥（AES-GCM 加密）、日限额、Provider 覆盖状态 |
| `/settings/usage` | 用量看板：按应用/Provider/日拆解 token 与成本 |

## 文档

- 总体设计（v2）：`docs/superpowers/specs/2026-06-09-starport-platform-design.md`
- 实施计划：`docs/superpowers/plans/`

## 技术栈

Next.js 16 · React 19 · TypeScript · Tailwind 4 · framer-motion · lucide-react（Phase 1 起引入 Prisma 7 + Postgres + iron-session）

页面统一通过 `src/lib/catalog.ts` 门面取数 —— Phase 1 将其内部实现替换为 Prisma 查询即可，页面零改动。
