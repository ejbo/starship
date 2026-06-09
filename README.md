# 星港 StarPort

> AI 时代的一站式应用、模型与 Agent 社交平台 —— Steam 之于游戏，星港之于 AI 造物。

承载 **应用 / AI 模型 / Agent / Skill / 互动教程 / 视频** 六类"造物"，统一的商店、港湾（库）、社区与星籍主页；核心创新是 **AI Gateway**（API Key 配置一次、全平台应用授权使用）、**Platform SDK**（应用生态打通）与 **Agent 一等公民**（圆桌会议、Skill 工坊）。

## 当前状态：Phase 0 雏形

假数据驱动的可浏览原型，体验商店 → 详情 → 港湾 → 主页 → 社区的完整壳子。

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| 路由 | 页面 |
|---|---|
| `/` | 商店：精选轮播、发现队列、分类星轨 |
| `/p/[slug]` | 造物详情：画廊、获取盒、运行环境、评测 |
| `/library` | 港湾：最近使用 + 全部藏品 |
| `/u/me` | 星籍主页：展柜、徽章、好友、留言板 |
| `/community` | 星潮：动态 Feed + 进行中的圆桌 |

## 文档

- 总体设计：`docs/superpowers/specs/2026-06-09-starport-platform-design.md`（愿景、Steam 映射、六大子系统、路线图）
- Phase 0 计划：`docs/superpowers/plans/2026-06-09-phase0-prototype.md`

## 技术栈

Next.js 16 · React 19 · TypeScript · Tailwind 4 · framer-motion · lucide-react（Phase 1 起引入 Prisma 7 + Postgres + iron-session）

页面统一通过 `src/lib/catalog.ts` 门面取数 —— Phase 1 将其内部实现替换为 Prisma 查询即可，页面零改动。
