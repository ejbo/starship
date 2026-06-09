# Phase 1a 数据库落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans。

**Goal:** 把假数据搬进本地 Postgres（Prisma 7），catalog 门面切换为真实查询，页面零改动可浏览。写路径（注册登录、获取/评测 API）留待 Phase 1b。

**Architecture:** 沿用 multillm-chat 的 Prisma 7 惯例（prisma.config.ts + @prisma/adapter-pg + db.ts 单例）。DB 实体与 `src/lib/types.ts` 一一映射；catalog.ts 内部改为 async Prisma 查询并把行映射回现有 TS 类型，组件不动、页面仅加 await。日期/相对时间 Phase 1a 保留展示字符串（与 mock 同构），Phase 1b 迁 DateTime。presence/留言板/圆桌/聊天仍为 mock（属 Phase 2/5）。

### Task 1: 依赖与基建
- [ ] 安装 @prisma/client @prisma/adapter-pg pg dotenv + dev(prisma tsx @types/pg)
- [ ] prisma.config.ts（dotenv 加载 .env）、.env（DATABASE_URL=postgresql://localhost:5432/starport_dev，gitignored）、.env.example（提交）
- [ ] src/lib/db.ts Prisma 单例

### Task 2: Schema 与迁移
- [ ] prisma/schema.prisma：User（badges Json/showcase String[]）、FriendEdge、Product（hueA/hueB/icon、histogram Int[]、priceCredits Int?=null 即免费、entryUrl?、capabilities String[]）、Review（作者去规范化 authorName/avatarHue/isAgent）、LibraryEntry（@@unique(userId,productId)）、ActivityEvent
- [ ] `createdb starport_dev` + `pnpm prisma migrate dev --name init`

### Task 3: 种子
- [ ] prisma/seed.ts（tsx 执行）：灌入 mock 的 products/reviews/currentUser/friends(+FriendEdge)/library/activity
- [ ] 跑通并 `psql` 抽查行数

### Task 4: 读路径切换与终验
- [ ] catalog.ts：查询改 Prisma（async），行→TS 类型映射集中在本文件；describeCapability 保持纯函数
- [ ] layout 与 5 个页面加 async/await
- [ ] build + curl 全路由 + 内容抽查（首页含「MultiLLM Chat」）→ commit → 合并 main
