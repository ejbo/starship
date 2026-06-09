# 星港 StarPort —— AI 时代的一站式应用与 Agent 社交平台

> 设计文档 · 2026-06-09 · 状态：v1 草案（用户要求直接出雏形，假设未逐条确认，欢迎批注修正）
> 工作代号：**星港 / StarPort**（Steam→Valve→阀门→蒸汽；我们→星港→星舰停靠的港口。备选名：星枢 Polaris、织云 Loom、回廊 Arcade）

---

## 1. 愿景与定位

**一句话：Steam 之于游戏，星港之于 AI 时代的应用、模型与 Agent。**

Steam 的本质是三位一体：**商店（分发）+ 库（拥有）+ 社区（社交）**，再加上把这三者粘合起来的开发者生态（Steamworks）和创意工坊（UGC）。星港复刻这个骨架，但把"游戏"替换为更广义的数字造物：

| 承载物 | 说明 |
|---|---|
| 应用 App | Web 应用（含第一方原生应用如 multillm-chat） |
| AI 模型 Model | 模型卡片、试用 Playground、API 接入 |
| Agent | 可被"领养/雇佣"的智能体，有自己的主页和履历 |
| Skill | Agent 的"装备/模组"，可安装到自己的 Agent 上 |
| 互动教程 Tutorial | 可运行、可步进的课程（类似游戏的"试玩 Demo"） |
| 视频 Video | 演示、课程、发布会 |

所有这些统一为一个多态的 **Product（造物）** 概念，共享同一套：详情页、评分评论、下载/获取、动态流、推荐系统。

## 2. Steam 功能映射（骨架复刻）

| Steam | 星港 | 备注 |
|---|---|---|
| 商店首页（精选轮播/分类行/发现队列） | 商店：精选星图、分类星轨、**发现队列** | 发现队列是 Steam 留存利器，必抄 |
| 游戏详情页 | 造物详情页：媒体画廊、获取按钮、标签、评测直方图 | "配置要求" → "运行环境：所需 API / 权限" |
| 库 Library | 港湾：我获取的应用/模型/Agent/Skill | 最近使用、收藏夹、自定义分组 |
| 个人主页（展柜/徽章/留言板） | 星籍主页：展柜、徽章、等级、好友留言板 | Agent 也有主页（见 §4.5） |
| 好友系统 + 在线状态 + 聊天 | 好友、在线状态（在用什么应用）、私聊 | "正在游玩 X" → "正在使用 X / 正在开会" |
| 评测系统（好评率/直方图/有价值标记） | 同构复刻：好评率、时间分布、"有价值"投票 | 信任度加权（拥有时长 = 使用时长） |
| 创意工坊 Workshop | **Skill 工坊**：给 Agent 装 Skill，像给游戏装 Mod | 星港最有原创性的映射 |
| Steamworks 开发者后台 | 开发者港务局：上传、定价、数据看板、灰度发布 | |
| Steam 钱包 | **API 配置中心 + 用量钱包**：BYOK 或平台代付额度 | 把"钱包"重定义为"算力/Token 额度" |
| 动态 Feed | 星潮 Feed：好友动态、关注的开发者/Agent 的更新 | |
| 鉴赏家 Curator | 鉴赏家：人类或 **Agent 策展人**发布推荐清单 | Agent 当鉴赏家是低成本高趣味的差异化 |
| 远程同乐 Remote Play Together | **协作会话**：邀请好友/好友的 Agent 进入同一应用会话 | |
| 大厅/组队 | **圆桌 Roundtable**：带自己的 Agent 参加小组讨论/会议 | 见 §4.5 |

## 3. 核心创新（超越 Steam 的三根支柱）

### 3.1 AI Gateway —— 配置一次，全平台通用
用户在平台配置一次 Claude/OpenAI/Gemini/xAI 的 API Key（或购买平台额度），平台上**任何**应用声明需要 LLM 能力时，用户一键授权即可使用，**原始 Key 永不暴露给第三方应用**：

```
应用 ──(platform token + scope)──> 星港 AI Gateway ──(用户的真实 Key)──> Anthropic/OpenAI/...
                                        │
                                   计量/限流/审计/脱敏日志
```

- Key 加密落库（envelope encryption），按 scope 授权（模型白名单、每日 token 上限）
- 应用的"配置要求"页声明所需能力（如 `llm:claude`, `storage:1GB`），获取时像手机 App 权限一样确认
- 用量看板：每个应用花了我多少 token，一目了然（Steam 的"游玩时长"→"消耗 token"）

### 3.2 Platform SDK —— 应用生态打通的关键
第三方应用以 iframe 沙箱运行，通过 postMessage 桥接的 `@starport/sdk` 获得：
- `sdk.user` 身份（OAuth 式授权后的 profile）
- `sdk.ai.chat(...)` 经 Gateway 代理的 LLM 调用
- `sdk.social` 好友列表（授权后）、邀请好友加入会话
- `sdk.storage` 每应用每用户的 KV/文件存储
- `sdk.presence` 上报"正在做什么"，反哺好友动态
第一方应用（multillm-chat）直接以 monorepo 包形式集成，吃同一套 SDK 接口，保证"自家孩子"和第三方平权。

### 3.3 Agent 是一等公民
- 用户可注册/导入自己的 Agent（system prompt + 模型偏好 + 已安装 Skills），Agent 有主页、头像、履历（参加过的会议、获得的评价）
- **圆桌 Roundtable**：开一个房间，人和各自的 Agent 围桌讨论。Agent 轮流发言/被 @、可被主持人静音；会后自动生成纪要。这是"带着 Agent 去开会"的落地形态
- Skill 工坊：社区上传 Skill，用户给自己的 Agent 安装，像 Steam 创意工坊给游戏装 Mod
- Agent 鉴赏家、Agent 在你离线时替你回复留言（可选）…… 后续脑洞空间巨大

## 4. 领域分解（六大子系统，按此顺序建设）

> 本项目规模 = 多个独立子系统，必须分解，每个子系统独立 spec → plan → 实施。本文档是总纲。

1. **Identity & Social Core**：账号、星籍主页、好友、在线状态、动态 Feed、留言板
2. **Catalog & Store**：多态 Product、详情页、标签、评分评测、获取/库、发现队列、搜索
3. **AI Gateway**：Key 保险库、代理端点、scope 授权、计量、用量看板
4. **App Runtime & Platform SDK**：iframe 沙箱、postMessage 桥、OAuth 授权流、第一方应用集成（multillm-chat）
5. **Agent Spaces**：Agent 注册/主页、Skill 安装、圆桌会议室
6. **Developer Portal（港务局）**：开发者认证、上传发布、版本管理、数据看板

## 5. 架构方案对比

| 方案 | 描述 | 取舍 |
|---|---|---|
| **A. 模块化单体（推荐）** | 一个 Next.js 16 应用 + Postgres，`src/modules/*` 严格分模块（identity/catalog/gateway/runtime/agents/devportal），模块间只通过显式导出的 service 接口调用 | 一人开发速度最快；与 multillm-chat 技术栈同构可互相搬运；将来按模块拆服务有清晰切线 |
| B. 微服务起步 | Gateway、Store、Social 各自独立服务 + 消息队列 | 对单人项目是自杀式开销，否决 |
| C. 单体 + 独立 Gateway | 主站单体，AI Gateway 单独一个轻服务 | 有道理（Gateway 是安全敏感+高吞吐路径），作为 Phase 3 的**预留演化方向**，起步仍并在单体内 |

**推荐 A，预留 C 的切线**：Gateway 模块从第一天起就不 import 其他模块的内部，只依赖自己的表。

## 6. 技术栈（与 multillm-chat 同构，最大化复用）

- Next.js 16（App Router）+ React 19 + TypeScript，pnpm
- Tailwind 4 + Radix UI + framer-motion（丝滑特效）+ lucide-react
- Prisma 7 + Postgres（本地 dev 用 docker 或已有实例）
- iron-session（与 multillm-chat 一致）；后续上 OAuth（GitHub/Google 登录）
- Vercel AI SDK（`ai` + `@ai-sdk/*`）做 Gateway 的 provider 适配层
- 实时：起步用 SSE（动态/聊天/圆桌流式发言），后续视需要上 WebSocket

## 7. 核心数据模型（首版）

```
User ──1:1── Profile（展柜、徽章、等级、签名）
User ──N:M── User  (FriendEdge: pending/accepted/blocked)
User ──1:N── ApiCredential（provider, 加密key, 标签）
User ──1:N── AgentIdentity（name, persona, model偏好）──N:M── Skill (AgentSkillInstall)

Product（多态: type = app|model|agent|skill|tutorial|video）
  ├─ 1:N Release（版本、变更日志、入口URL/包）
  ├─ 1:N MediaAsset（截图/视频/封面）
  ├─ N:M Tag
  ├─ 1:N Review（评分1-5、正文、有价值投票数、使用时长快照）
  └─ RequiredCapability（llm:claude, storage, social:friends …）

LibraryEntry（user × product：获取时间、最近使用、使用时长、分组）
ActivityEvent（feed 源：获取了X/评测了X/上线了X/开了圆桌…）
GatewayGrant（user × product × scope：模型白名单、日限额、状态）
UsageRecord（grant、模型、tokens in/out、成本、时间）——聚合成用量看板
Room（圆桌：题目、成员[User|Agent]、消息流、纪要）
DevAccount ──1:N── Product
```

## 8. 视觉与体验设计语言

- **基调**：深空暗色（Steam 的 #1b2838 气质，但原创化）：近黑的深靛蓝底 + 星云渐变点缀（aurora 青→紫），毛玻璃卡片，细腻 hover 发光
- **关键体验抄作业**：卡片 hover 出预览浮层（Steam 商店标志性交互）、评测直方图、库的横向封装画（capsule art）网格、个人主页展柜
- **动效**：framer-motion 做页面转场/卡片浮起/轮播；遵守"快速响应优先于华丽"，所有动效 ≤ 250ms
- 全站中文优先，预留 i18n

## 9. 安全与隐私（红线）

- API Key：AES-GCM envelope encryption 落库，解密只发生在 Gateway 代理请求的瞬间，永不下发前端/第三方
- 第三方应用：iframe sandbox + CSP + postMessage origin 校验；SDK 每个能力一个 scope，用户显式授权
- 评测/社交内容：基础反滥用（频率限制、举报）；Agent 发言要标记"AI 生成"
- 上传应用：起步用人工审核 + 域名白名单托管，不做任意代码托管（YAGNI）

## 10. 路线图

| Phase | 内容 | 验收 |
|---|---|---|
| **0 雏形（本次）** | 脚手架 + 设计系统 + 商店首页/详情页/库/星籍主页壳子，假数据驱动 | `pnpm dev` 可浏览，体验出"星港味" |
| 1 目录与账号 | Prisma 落库、注册登录、Product CRUD、评测、库 | 真数据跑通获取→评测闭环 |
| 2 社交核心 | 好友、动态 Feed、留言板、在线状态 | 两账号互加好友看到彼此动态 |
| 3 AI Gateway | Key 配置中心、代理端点、scope 授权、用量看板 | 一个 demo 应用经 Gateway 调通 Claude |
| 4 App Runtime | SDK + iframe 沙箱 + multillm-chat 接入 | multillm-chat 在站内用 Gateway 跑起来 |
| 5 Agent Spaces | Agent 注册、Skill 工坊、圆桌会议 | 2 人 + 2 Agent 完成一场圆桌并出纪要 |
| 6 港务局 | 开发者上传、版本发布、数据看板 | 第三方应用走完上架流程 |

## 11. 测试策略

- 模块 service 层：vitest 单测（Gateway 的 scope/计量逻辑是重点）
- API 路由：集成测试（测试库 + supertest 风格）
- UI：关键流 Playwright 冒烟（获取→出现在库；配 Key→授权→调用）
- 雏形阶段（Phase 0）以 `pnpm build` + 手动浏览为验收，不强求测试覆盖

## 12. 风险与开放问题

1. **范围巨大**：靠子系统分解 + 每 Phase 独立闭环对冲；任何时刻砍掉后续 Phase 都留下可用产品
2. Gateway 成本风险：用户 Key 被滥刷 → 日限额默认保守、异常告警
3. 第三方应用质量：起步白名单制，生态做大再开放
4. 命名/品牌：星港 StarPort 为工作代号，可随时换
5. 视频托管成本：起步只做外链嵌入（YouTube/B站），不自建存储
