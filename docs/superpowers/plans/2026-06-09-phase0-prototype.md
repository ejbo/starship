# 星港 Phase 0 雏形 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出可 `pnpm dev` 浏览的星港雏形：商店首页、造物详情页、库（港湾）、星籍主页、社区 stub，全部假数据驱动，体现 Steam 式体验与星港视觉语言。

**Architecture:** 单 Next.js 16 App Router 应用；`src/lib` 放类型与假数据（未来被 Prisma service 替换，接口形状即 Phase 1 的 service 返回形状）；`src/components` 放设计系统与业务组件；页面为 Server Components，交互组件（轮播/hover 预览）为 Client Components。无图片资源 —— 用程序化"封装画"（渐变 + 图标 + 噪点）代替，规避素材问题。

**Tech Stack:** Next.js 16.2 / React 19 / TypeScript / Tailwind 4 / framer-motion / lucide-react / clsx + tailwind-merge。雏形不引入 Prisma、不引入测试框架（验收 = `pnpm build` 通过 + 手动浏览，见 spec §11）。

---

### Task 1: 脚手架（手工，不用 create-next-app —— 目录已含 docs/ 会被拒）

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`(临时占位), `src/lib/cn.ts`

- [ ] **Step 1:** 写 `package.json`：deps = next@16.2.6, react/react-dom@19.2.4, framer-motion, lucide-react, clsx, tailwind-merge；devDeps = typescript, @types/react, @types/react-dom, @types/node, tailwindcss@^4, @tailwindcss/postcss@^4。scripts: dev/build/start。
- [ ] **Step 2:** `next.config.ts` 设 `eslint: { ignoreDuringBuilds: true }`（雏形不配 eslint）；`tsconfig.json` 抄 multillm-chat 约定（paths `@/*` → `./src/*`）。
- [ ] **Step 3:** `pnpm install`，确认 lockfile 生成。
- [ ] **Step 4:** `globals.css` 用 Tailwind 4 语法（`@import "tailwindcss"` + `@theme`）定义星港 design tokens（见 Task 2）。`layout.tsx` 挂全局字体栈与暗色底。`page.tsx` 临时输出"星港"。
- [ ] **Step 5:** `pnpm build` 通过 → commit `chore: Next.js 16 脚手架`。

### Task 2: 设计系统 tokens + 基础组件

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/lib/cn.ts`, `src/components/ui/capsule-art.tsx`, `src/components/ui/type-badge.tsx`, `src/components/ui/rating.tsx`

设计语言（spec §8 落地）：
- 底色 `--bg: #0a0e1a`（深空靛黑）、面板 `#11182b`、毛玻璃卡 `rgba(20,28,50,.7)+blur`
- 主光 `--aurora-a: #4cc9f0`（青）→ `--aurora-b: #a06bff`（紫）渐变；文本主 `#dbe4ff`、次 `#7e8aa8`
- 圆角 10px、卡片 hover：translateY(-3px) + 边缘辉光，duration 200ms

- [ ] **Step 1:** `cn.ts`：`clsx` + `tailwind-merge` 标配工具。
- [ ] **Step 2:** `CapsuleArt`：props `{ seed: ProductArt; ratio: 'wide'|'tall'|'square'; iconName }` —— 由产品自带的两个 hue 生成渐变 + lucide 图标浮雕 + SVG 噪点叠加，作为全站"封面图"。
- [ ] **Step 3:** `TypeBadge`（应用/模型/Agent/Skill/教程/视频 六色徽章）、`Rating`（星 + 分数 + 好评率文案，Steam 式"特别好评/多半好评"措辞映射）。
- [ ] **Step 4:** `pnpm build` → commit `feat: 星港设计系统基础组件`。

### Task 3: 类型与假数据层（= Phase 1 service 接口形状）

**Files:**
- Create: `src/lib/types.ts`, `src/lib/mock/products.ts`, `src/lib/mock/users.ts`, `src/lib/mock/activity.ts`, `src/lib/catalog.ts`

- [ ] **Step 1:** `types.ts`：

```ts
export type ProductType = 'app' | 'model' | 'agent' | 'skill' | 'tutorial' | 'video';
export interface ProductArt { hueA: number; hueB: number; icon: string }
export interface Product {
  id: string; slug: string; type: ProductType;
  name: string; tagline: string; description: string[];   // 段落数组
  art: ProductArt; tags: string[];
  rating: { score: number; count: number; histogram: number[] }; // histogram 近10期好评率
  acquisitions: number; developer: string; price: 'free' | { credits: number };
  capabilities: string[];   // 如 'llm:claude' 'storage:1gb' 'social:friends'
  releasedAt: string; updatedAt: string; featured?: boolean;
  reviews: Review[];
}
export interface Review { author: string; avatarHue: number; score: 1|2|3|4|5; usageHours: number; helpful: number; body: string; date: string }
```

- [ ] **Step 2:** `mock/products.ts`：≥14 个产品覆盖全部 6 类型，含 multillm-chat、圆桌 Roundtable、Claude 模型卡、代码评审 Agent、深度研究 Skill、Prompt 工程互动教程等；3-4 个 `featured`。每个产品 2-4 条有血有肉的中文评测。
- [ ] **Step 3:** `mock/users.ts`：当前用户（等级/徽章/展柜引用 product slugs）+ 6 个好友（在线状态：在线/正在使用X/离线）。`mock/activity.ts`：10 条动态事件。
- [ ] **Step 4:** `catalog.ts`：查询门面 `getFeatured() / getByType(type) / getBySlug(slug) / getLibrary() / getFriends() / getFeed()` —— 页面只 import 这个文件，Phase 1 换 Prisma 实现时页面零改动。
- [ ] **Step 5:** `pnpm build` → commit `feat: 假数据层与目录门面`。

### Task 4: 全局壳（导航 + 页脚 + 布局）

**Files:**
- Create: `src/components/global-nav.tsx`, `src/components/site-footer.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1:** `GlobalNav`（client）：左 = 星港 logo（文字+辉光星点）；中 = 商店/港湾/社区/港务局 链接（当前路由高亮，下划线辉光滑动）；右 = 搜索框（静态）、用量额度 pill（"⚡ 1.2M tokens"）、头像。粘性顶栏 + 滚动后毛玻璃化。
- [ ] **Step 2:** `SiteFooter`：版权 + "Phase 0 雏形" 标识 + spec 路线图链接。
- [ ] **Step 3:** 接入 layout，`pnpm build` → commit `feat: 全局导航与布局壳`。

### Task 5: 商店首页 `/`

**Files:**
- Create: `src/app/page.tsx`(重写), `src/components/store/hero-carousel.tsx`, `src/components/store/section-row.tsx`, `src/components/store/product-card.tsx`, `src/components/store/discovery-queue.tsx`

- [ ] **Step 1:** `HeroCarousel`（client，framer-motion AnimatePresence）：featured 产品全幅轮播，左侧大封装画、右侧名称/标语/标签/评分/获取按钮；底部指示点；6s 自动轮播 + hover 暂停。
- [ ] **Step 2:** `ProductCard`：封装画 + 名称 + 类型徽章 + 标签 + 评分；hover 浮起 + 辉光 + 显示 tagline 与获取数（Steam hover 预览的简化版，纯 CSS group-hover，零布局抖动）。
- [ ] **Step 3:** `SectionRow`：标题 + "查看全部" + 横向滚动卡片列（scroll-snap）。首页排布：精选轮播 → 发现队列横幅 → 「热门应用」「AI 模型」「Agent 招募所」「Skill 工坊」「互动教程」行。
- [ ] **Step 4:** `DiscoveryQueue`：渐变横幅卡，"今日发现队列：12 个为你挑选的造物"，按钮指向第一个推荐详情页。
- [ ] **Step 5:** `pnpm build` → commit `feat: 商店首页`。

### Task 6: 造物详情页 `/p/[slug]`

**Files:**
- Create: `src/app/p/[slug]/page.tsx`, `src/components/product/media-gallery.tsx`, `src/components/product/acquire-box.tsx`, `src/components/product/capability-list.tsx`, `src/components/product/review-section.tsx`, `src/components/product/rating-histogram.tsx`

- [ ] **Step 1:** 页面骨架：面包屑（商店 / 类型 / 名称）→ 标题区 → 左 2/3 媒体画廊 + 简介 + 评测区，右 1/3 粘性侧栏（获取盒 + 运行环境 + 开发者 + 标签云）。`generateStaticParams` 全量产品。不存在 slug → `notFound()`。
- [ ] **Step 2:** `MediaGallery`（client）：主画面 + 缩略图条（同一产品的 4 个变体封装画，模拟截图），点击切换带淡入。
- [ ] **Step 3:** `AcquireBox`：价格（免费/⚡credits）、"添加到港湾"主按钮（点击变为"已在港湾 ✓"，本地 state 即可）、获取数、发布/更新时间。
- [ ] **Step 4:** `CapabilityList`：Steam"配置要求"的星港版 —— 每个 capability 一行（图标 + `llm:claude → 需要 Claude API（可用你的星港配置）`），底部提示"获取时将请求授权"。
- [ ] **Step 5:** `ReviewSection` + `RatingHistogram`：总评（好评率措辞 + 直方图柱状近10期）+ 评测卡（作者色块头像、使用时长、正文、"有价值"计数按钮）。
- [ ] **Step 6:** `pnpm build` → commit `feat: 造物详情页`。

### Task 7: 港湾 `/library` 与 星籍主页 `/u/[handle]`

**Files:**
- Create: `src/app/library/page.tsx`, `src/app/u/[handle]/page.tsx`, `src/components/profile/showcase.tsx`, `src/components/profile/friend-list.tsx`

- [ ] **Step 1:** 港湾：左侧栏（全部/按类型过滤的计数列表，静态）+ 主区「最近使用」大卡行 + 全部藏品 capsule 网格（tall 比例封装画，hover 显示"启动"按钮）。
- [ ] **Step 2:** 星籍主页：星云 banner + 头像/昵称/等级徽章/签名 → 三栏：展柜（精选造物）+ 动态（来自 activity）+ 右栏好友列表（在线状态色点 + "正在使用 X"）与留言板（静态 3 条）。
- [ ] **Step 3:** `pnpm build` → commit `feat: 港湾与星籍主页`。

### Task 8: 社区 stub `/community` + 收尾

**Files:**
- Create: `src/app/community/page.tsx`, `README.md`
- Modify: `src/app/layout.tsx`（metadata）

- [ ] **Step 1:** 社区页：星潮 Feed（activity 流卡片：谁获取/评测/上线了什么，带产品小封装画）+ 右栏"活跃圆桌"占位卡（列 2 个进行中的圆桌：题目/成员头像含 Agent 标记/旁听按钮，按钮 disabled 标"Phase 5"）。
- [ ] **Step 2:** README：项目简介、`pnpm dev` 说明、链接两份文档。metadata：title "星港 StarPort"。
- [ ] **Step 3:** 终验：`pnpm build` 通过；`pnpm dev` 起服 curl 检查 `/`、`/p/multillm-chat`、`/library`、`/u/me`、`/community` 均 200。
- [ ] **Step 4:** commit `feat: 社区stub与收尾` → 汇报。

---

## Self-Review 记录

- Spec 覆盖：spec §10 Phase 0 范围（脚手架/设计系统/商店/详情/库/主页壳子）→ Task 1-8 全覆盖；社区 stub 为加项（spec §2 动态 Feed 的壳）。
- 类型一致性：页面统一经 `catalog.ts` 门面取数；`ProductArt`/`Review` 在 Task 3 定义后被 4-8 引用。
- 无测试框架符合 spec §11 雏形豁免；验收命令明确（build + curl）。
