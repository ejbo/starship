# 开发者平台与开放 API 设计（Phase 6）

> 2026-06-09 · 参照 Steamworks（客户端 SDK + Web API + 成就/统计 schema）。

## 目标
让开发者把应用（含外部部署的 web 应用）上架到星港，并通过原生接口与平台双向交换数据：平台 → 应用（用户身份/资料）、应用 → 平台（成就、游戏时长、自定义统计）。平台在回流数据上建成就系统、稀有度、时长、动态。

## 两个集成面（共用同一成就/统计后端）
1. **沙箱 SDK**（应用跑在平台 iframe 内）：postMessage RPC。已具备 identity/ai/storage，本期加 `achievements.unlock` / `stats.submit`。
2. **开放 REST API**（应用部署在任意位置，服务器到服务器）：OAuth2 授权码流拿 user access token，`/api/v1/*` 读用户资料、回传成就与统计。

## 数据模型
- Product 增加：`status`(draft|published)、`ownerUserId`、`clientId`、`clientSecretHash`。
- `Achievement`(productId,key,name,description,icon,hidden) + `@@unique[productId,key]`
- `AchievementUnlock`(achievementId,userId,at) + `@@unique[achievementId,userId]`
- `StatRecord`(productId,userId,key,value) + `@@unique[productId,userId,key]`（playtime_minutes 等）
- `OAuthGrant`(productId,userId,scopes,code,codeExpiresAt,accessToken,createdAt)（Phase 6b）

## 鉴权
- 应用密钥 `sk_app_<rand>`，scrypt 哈希存 `clientSecretHash`，明文仅创建/重置时展示一次。
- 用户态：OAuth2 授权码 → access token（opaque），`Authorization: Bearer <token>`，按 scope 限定。
- 用户数据仅暴露公开字段（handle/name/avatarHue/level），绝不含邮箱/密钥。

## 开放 API（Phase 6b）
- `POST /api/v1/oauth/token`：code + client_id + client_secret → access_token
- `GET  /api/v1/me`：用户公开资料（scope identity）
- `GET  /api/v1/achievements`：应用成就 schema + 该用户解锁态
- `POST /api/v1/achievements/unlock`：解锁 {key}（scope achievements:write）
- `POST /api/v1/stats`：提交 {playtimeMinutes?, stats?{}}（scope stats:write），playtime 累加库使用时长
- `GET  /api/v1/stats/global`：全站成就稀有度%

## 用户可见产物
- 个人主页成就墙（最近解锁）、详情页成就列表（含全站稀有度%，Steam 式）
- 解锁成就 → 动态事件
- 游戏时长回流 → 库 usageHours / 主页统计

## 发布与归属
- 登录用户创建应用即成为开发者；Product.ownerUserId=创建者，初始 status=draft。
- 商店/分类/精选/发现仅显示 published；详情页可被 owner 预览草稿（草稿标记）。
- 种子产品 status=published、ownerUserId=null（官方）。

## 安全/边界（prototype）
- 自助发布（无人工审核）；外链应用以 sandbox iframe 同源 demo 演示，真实应用为外部 URL。
- access token 不过期轮换（prototype）；REST 限流从简。
