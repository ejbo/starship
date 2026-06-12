# 星港 · 开放开发者平台 设计方向（暂存 · 待原生应用铺好后再推进）

> 状态：**方向性总结，暂不实现**。先铺自有原生应用，用它们当真实样例沉淀接口形状，再抽象成开放生态。
> 记录时间：2026-06-11。延续上一阶段结论（集成已很干净、隔离、可降级；门槛在"手抄 + 跑脚本 + 没版本化"）。

## ★ 决定（2026-06-12）：分发模型 = B 档（开发者自托管，平台不托管产品）

**最终选定 B 档**（详见第六节分档）。理由：开发者最自由（可用自己已有的平台/服务器，也可走星港上架）、源码最私密（留在开发者侧）、**平台零托管成本/零运行不可信代码的安全负担**。

平台的角色 = **商店门面 + 账号/身份 + 社交/成就 + 支付/计费 + 发现**；**绝不托管、不运行开发者的产品代码**。"上架"上的是一条登记记录（商店信息 + 入口 URL + OAuth 凭证 + 权限），不是代码。

**这条路成立的唯一硬前提 —— 付费强制力（entitlement enforcement）**：因为平台不是宿主，付费墙必须靠应用集成平台机制来 enforce（否则裸 URL 可被直连绕过付费）。最小闭环：
1. `/api/v1/me`（或独立端点）返回 **entitlement**：该用户是否拥有/订阅本应用（数据已存于 `LibraryEntry`，购买即写）。
2. 启动流程除 OAuth 外再发一张**短时、平台签名的 launch token**（`{userId, productId, 是否已购, exp}`），应用验签。
3. SDK 封一行 `requireEntitlement()`，开发者一句话 gate 住。
4. **付费应用上架强制接入校验、审核时验过才准上**；免费应用不需要。
> 强制力光谱：弱（应用查 /me 自觉 gate）→ 中（验签名 launch token，推荐）→ 强（开发者把应用配成只收平台签名请求、拒绝一切直连）。与 Steam 同理：Steam 也不阻止运行二进制，是游戏自查"是否拥有"。
> 取舍认账：A/C 档（平台托管）能在门口硬挡付费墙、强制力最强但平台扛成本；**B 档用"零托管成本 + 开发者最自由"换"付费墙靠约定 + 审核"**。可叠加"平台计量消费"（走 Gateway/存储/点数，直连拿不到受计量资源）作为更硬的变现。

> 现状：上架机制（/developer 创建应用拿 client 凭证、填 entryUrl/launchMode、媒体、成就、发布开关、接入文档）**绝大部分已就绪**；缺的是上面的 entitlement 闭环 + 上架表单里显式声明 scopes + 版本/审核/回滚。**暂不实现**——用户先铺自有原生应用。

## 一、愿景

让任意开发者以**最低门槛、最高自由度**接入平台 —— 不只是"消费平台能力"，还能"**贡献能力给平台**"，
让应用之间能互相发现、互相调用，形成生态。开发者的应用既是 **consumer**，也可以是 **provider**。

## 二、三大支柱

### 支柱 1 · Widgets（开发者 UI 卡片，嵌进用户界面）
开发者声明可嵌入的 widget，展示在用户**个人主页 / 库 / 仪表盘 / 社区动态**等位置。
- 形态：沙箱 iframe（复用现有 `/run` 运行时 + postMessage SDK 的"小尺寸 + 嵌入"变体）。
- 数据：widget 经 SDK 拉**自己应用的数据** + **平台开放数据**（按授权）。
- 体验：用户可像桌面小组件一样**自由增删、排布、缩放**；按权限拉数据。
- 契约：尺寸/位置规范、刷新策略、空/错态、隔离与 CSP。

### 支柱 2 · 更开放的平台 API（平台 → 应用）
现有自描述能力（manifest + scope 授权）：`identity / achievements / stats / presence / gateway:llm / keys:read`。
- 拓展方向（每加一项 = manifest 加一条 + 一个 scope）：好友图、库存、动态流、通知、点数/钱包、媒体上传、搜索……
- 已有版本化基座：manifest `schema: starport.platform/v1`，机器可读、可被 agent/应用自动发现。

### 支柱 3 · 开发者贡献能力 / 数据（应用 → 平台 → 其他应用）★最有想象力
应用把**自己对外开放的接口/数据**注册进平台的**统一能力注册表**，供其他应用发现 + 调用。
- 开发者在开发者中心声明：端点 schema、所需 scope（由提供方定义）、配额/计费。
- 平台做**中间层 broker**：鉴权、用户同意、路由、限流、计费、审计。
- 例：日历应用开放 `calendar:read`；AI 助理应用调用它读用户日程 —— 用户在中间一次授权。

## 三、架构怎么落（接住现有设计，不另起炉灶）

1. **统一能力注册表**：把 `platform-manifest` 从"平台自带端点"升级为"**平台 + 各应用贡献端点**"的总目录（machine-readable）。
2. **三方授权**：当前是 user↔app 两方 OAuth；贡献数据需要再加一层"**允许 app A 访问你在 app B 的数据**"的 consent + provider 定义的 scope，平台做 broker。
3. **路由代理（app→app 经平台网关）**：像现在 `gateway:llm` 代理模型那样——平台注入身份、记账、限流、审计；**提供方拿不到调用方明文凭证，调用方拿不到提供方内部细节**。
4. **SDK 化**（延续上轮结论）：拆成 `widget SDK`（嵌入展示）+ `provider SDK`（声明你开放的能力）+ `consumer SDK`（调别人的能力），全部**语义化版本**，对齐 manifest 版本。

## 四、关键设计考量（先记下来，实现时展开）

- **安全 / 隔离**：widget 沙箱、数据**最小授权**、用户可随时撤销、全程审计日志。
- **版本 / 兼容**：能力带 schema 版本；提供方变更走**弃用周期**，不破坏调用方。
- **计费 / 配额**：贡献方可设配额/计费；平台抽成（复用应用销售 70/30 模型）。
- **发现 / 信任**：能力市场 + 评分/用量（复用现有评测/排行榜）。
- **用户主权**：用户能看到"**谁在用我的什么数据**"，一键撤销（类比 presence 的 `leaving`）。

## 五、与当前优先级的关系（路线）

1. **现在**：铺自有原生应用上架 —— 正好当"贡献方/消费方"的真实样例，验证接口形状。
2. 沉淀出 3–4 个稳定能力。
3. 抽 **SDK + 能力注册表**（先把支柱 2 的开放面 + 支柱 1 的 widget 跑通）。
4. 开放支柱 3（app→app 互调 broker）给第三方。

> 前置依赖（上一阶段已识别）：把 `starport/` 这套集成抽成**版本化 SDK / 脚手架**，把"注册/上线"从脚本搬进**开发者中心 UI**（填 entryUrl + launchMode + scopes + 自助 client 凭证）。这两件是本愿景的地基。

## 六、应用打包 / 上传 / 托管模型（含主流平台调研 · 2026-06）

### 主流平台怎么做（关键结论：它们都是"分发编译产物到用户设备"，不在平台服务器跑）
- **Steam（SteamPipe/SteamCMD）**：开发者上传**编译后的二进制 + 资源**，按 depot 组织 → 切 ~1MB 块、压缩、**加密**、生成 manifest、分配 buildID。游戏跑在**用户机器**上，不上传源码，Steam 只做内容分发。
- **Apple（App Store Connect）**：上传**编译后的 .ipa**（Xcode/Transporter/altool）→ 自动处理 + 人工审核（1–2 天）→ 跑在**用户设备**。不上传源码。
- **Google Play**：上传 **AAB**（编译产物）→ Google 按设备生成优化 APK 并**由 Google 签名** → 跑在**用户设备**。不上传源码。
- **itch.io（最像星港的 web 应用场景）**：上传 ZIP（index.html + 资源）或单 HTML，itch.io **托管静态文件**并在**沙箱 iframe** 里跑在用户浏览器。无服务端执行开发者代码 —— 这≈星港现有的"hosted HTML"档。

→ Steam/Apple/Google **不在自己服务器运行应用**，所以"源码保护"=分发编译二进制。星港是 web 应用，要"平台托管并保护源码"，真正的对标是 **PaaS（Cloud Run / Fly.io / Heroku）**，不是 Steam。

### Container 托管（用户提议："开发者传 container、我来 host、避免泄漏源码"）评估
- **能保护源码吗？** 部分能。镜像装的是**构建产物**、且只有**平台**持有（不发给终端用户/竞品）→ 达成"不对外泄漏"的目标。但镜像层可被解包；解释型语言（Node/Python）若不 bundle/minify/编译，镜像内仍是可读源码（对平台运营方不保密）。**真要保护：让开发者打包前 bundle/minify/编译。**
- **最私密的其实是"自托管 URL"**（multillm 那种）：源码根本不离开开发者服务器，平台零算力成本。
- **运行不可信代码的硬成本**：普通容器**不是安全边界**（2019–2025 有 17 个 Critical 容器逃逸 CVE，如 runc CVE-2024-21626）。多租户跑不可信代码必须上 **microVM 隔离**：Firecracker（AWS，~125ms 启动、硬件 KVM 隔离，Lambda/Fargate 在用）/ Kata（硬件边界）/ gVisor（用户态内核，弱于 VM）。等于自建一个迷你 PaaS：镜像仓库 + 构建流水线 + 隔离运行时 + 出网管控 + 配额 + 密钥管理 + 自动扩缩 + 计费/审计。

### 建议：分档模型（给开发者一个阶梯，而非二选一）
- **A 档 · 静态托管**：上传前端构建包（ZIP/单 HTML）→ 平台沙箱 iframe 服务。给"纯前端 + 用平台 SDK/Gateway"的应用。最便宜最安全；**星港已有 hosted-HTML 原语**。
- **B 档 · 外部 URL（自托管）**：开发者自己托管后端 + 注册 entryUrl + OAuth（=现在 multillm）。源码最私密（留在开发者侧）、平台零算力；缺点是开发者自己运维、平台不保证其可用性/安全。
- **C 档 · 容器托管**：开发者推 OCI 镜像 → 平台在 **Firecracker/Kata microVM** 里跑，挂平台反代 + OAuth。满足"源码对用户保密 + 又不想自己运维"。平台成本/复杂度最高，**最后再做**，且要先有需求 + 计费模型摊平算力（复用应用销售 70/30 思路）。
  - 落地建议：别从零自建隔离，先**用托管 PaaS 兜底**（Cloud Run / Fly.io / 基于 Firecracker 的 runner），配审核 + 配额 + 计费门槛。

### 版本化构建流水线（接住"跨应用版本控制"诉求）
三家都有"build → 处理 → （审核）→ 发布/回滚"且**每次上传=一个带 ID 的 build**（Steam buildID、Apple build 处理、Google AAB→签名）。星港应照搬：**每次上传=一个版本**，有处理步骤、可选审核、可发布/回滚/灰度。这正是"跨应用版本控制"的载体。

**调研来源**：[Steam SteamPipe](https://partner.steamgames.com/doc/sdk/uploading) · [Steam Builds](https://partner.steamgames.com/doc/store/application/builds) · [Apple 上传 build](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/) · [Google AAB FAQ](https://developer.android.com/guide/app-bundle/faq) · [itch.io HTML5](https://itch.io/docs/creators/html5) · [microVM 隔离 2026](https://emirb.github.io/blog/microvm-2026/) · [Firecracker vs gVisor](https://northflank.com/blog/firecracker-vs-gvisor)
