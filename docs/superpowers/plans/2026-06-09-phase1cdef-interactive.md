# Phase 1c–1f 交互化 Implementation Plan

> 承接用户指令：实现 ①获取/评测写路径 ②真实账号 ③真实好友/在线状态 ④App Runtime（跳过圆桌）。
> 每个子阶段独立分支 → 实现 → build+冒烟 → 合并 main。所有用户态经 `getSessionUserId()` 收口。

## Phase 1c — 获取/评测写路径（①）
- 页面交互化：`/`、`/p/[slug]`、`/library`、`/u/[handle]`、`/community` 改 `force-dynamic`（去 SSG，反映实时写入）
- library-service.ts：`isInLibrary(slug)` / `acquire(slug)` / `removeFromLibrary(slug)`（Server Actions），acquire 同时 `acquisitions++`
- review-service.ts：`submitReview(slug, score, body)`，插入后重算 `ratingScore/ratingCount`；同一用户重复提交则更新
- AcquireBox 接 server action（真实 acquired 状态 + 启动）；产品页加「写评测」表单（登录后可见）
- 验收：acquire 后 library 出现该项、acquisitions+1；提交评测后总评数+1 且均分变化

## Phase 1d — 真实账号（②）
- 依赖 iron-session；User 加 `passwordHash`；password.ts 用 node:crypto scrypt（加盐，格式 salt:hash）
- session.ts 重写：`getSession()`（iron-session）、`getSessionUserId()`（未登录抛 redirect）、`getSessionUserIdOrNull()`
- /login /register（Server Actions：register/login/logout），注册即登录
- 浏览（商店/详情）允许匿名；获取/评测/库/个人主页/设置 需登录
- GlobalNav：登录态显示头像+设置+登出，未登录显示「登录」；layout 用 OrNull 容错
- seed：me 设密码（me / starport123）；friends 也设密码
- 验收：注册新用户→空库→获取→库有；登出后访问 /settings 跳 /login

## Phase 1e — 真实好友/在线状态（③）
- User 加 `lastSeenAt`(String) / `currentActivity`(String?)；touchPresence() 在已登录布局更新 lastSeen
- presence-service.ts：好友列表（FriendEdge accepted 双向）、派生在线状态（lastSeen 近 5 分钟=在线；currentActivity 存在=using）
- 好友管理：按 handle 加好友（建 pending 边）、接受、删除；待处理请求区
- Message 表（fromId/toId/body/at）：FriendsDock 聊天持久化（打开拉历史，发送落库，无实时推送）
- FriendsDock 改读真实好友 + 真实消息（去 mock）；/run 启动应用时写 currentActivity
- 验收：A 加 B→B 接受→互见好友；发消息刷新仍在；启动应用后好友看到「正在使用 X」

## Phase 1f — App Runtime（④）
- public/starport-sdk.js：guest 侧 window.starport（postMessage RPC：ready/identity/ai.chat/storage.get/storage.set）
- AppStorage 表（userId/productSlug/key/value，@@unique）
- /run/[slug] 主机桥（client）：渲染 iframe + 处理 SDK 消息；identity 来自 session，storage 走 AppStorage，ai.chat 经 Gateway 主机侧（解密 Key 仅服务端，演示返回 mock 但展示真实链路）
- 参考 demo guest：public/sandbox-demo/index.html 用 SDK 展示身份/AI/存储；新增第一方产品 `sdk-playground` entry 指向它，使 iframe 真实加载可交互
- 授权：启动前展示将授予的能力（复用 capability 列表）
- 验收：打开 sdk-playground，iframe 内显示当前用户名、点按钮经 SDK 拿到 AI 回复、写读 storage 持久化
