# 聊天系统完善（消息交互 / 语音 / 会议 / 体验打磨）

把好友系统里的聊天打造得接近 Discord/Steam 的完整度。全部基于既有 **2s 轮询**（无 WebSocket）。

## 消息级交互
- **表情反应**：消息悬停 → 快捷表情或 emoji 选择器；反应条聚合显示 `emoji ×N`，自己加的高亮。
- **回复/引用**：悬停 → 回复；输入区显示引用预览；消息顶部渲染引用条，点击跳转原消息（高亮闪烁）。
- **编辑/删除**：本人消息可改（行内编辑，标「已编辑」）/删（软删占位「此消息已删除」，群主可删群内任意）。
- **悬停操作条**：回复 / 反应 / 复制 / 编辑 / 删除。

### 关键机制：变更通过轮询传播
原轮询只取 `at>since` 的**新消息**，感知不到对已有消息的编辑/删除/反应。新增 **`updatedAt` 变更游标**
（Message/GroupMessage）：任何 send/edit/delete/toggleReaction 都刷新它，轮询用 `updatedAt>since` 取
「我会话内变更行」作 `mutations` 增量返回，客户端 `patchMessage` 原地打补丁（带 `updatedAt` 幂等护栏）。
反应统一表 `MessageReaction(scope+messageId)` 覆盖私聊与群聊。**命门**：toggleReaction 必须同步 `touchMessageUpdated`，否则纯反应变化不传播。

## 语音消息 + 语音转文字
- **录音**：`MediaRecorder`（`pickAudioMime` 选 webm/opus 或 mp4，24kbps 单声道，≤120s，≤2MB）→ dataURL，
  复用附件管道（`kind="voice"`，时长编进 `attachmentName="voice:12.4"`，**零迁移**）。
- **播放**：胶囊播放器（播放/进度/时长），`<audio preload="none">`。
- **转文字**：录音时并行 `SpeechRecognition`（Chrome/Edge，`zh-CN`），final 文本写进语音消息 `body` 作字幕，
  气泡下「转文字 ▾」展开。不可用浏览器静默跳过。
- **降级**：`canRecordVoice()` 探测 `isSecureContext`+`mediaDevices`+`MediaRecorder`；裸 http 提示「需 HTTPS」而非坏按钮。

## 会议（语音房间在场层）
voice 频道点 ☎ **加入语音房间**：`VoiceParticipant(roomId=channelId)`，join=upsert / leave=delete，每轮 poll
刷 `lastSeenAt`、读时 6s 窗口判活（兜掉关页没发离开）。频道下渲染在场头像 + 麦克风开关（micOn 同步）。
**纯轮询、裸 http 可用**——这是可用的会议骨架。真实 WebRTC 音频是后续（需 HTTPS + 信令）。

## typing / 已读
新表 `ChatSignal(userId,scope,typingAt,readAt)`，scope 对称（DM=`dm:sorted(a,b)`，频道=`ch:<id>`）。
- **typing**：输入时节流 3s 上报，5s TTL 自然过期；poll 传 `openConvKeys` 只查打开的会话；底部三点气泡。
- **已读（DM）**：激活会话/滚到底节流上报 readAt；poll 取对端 readAt；最后一条「我发的已读消息」下标「已读」。

## 体验打磨（均裸 http 可用）
- 回到底部/未读浮标、拖拽上传遮罩、通知声（WebAudio Oscillator，首次交互后）、链接 linkify（安全 React 节点，
  不 innerHTML）、emoji 分组/搜索/最近使用、消息 data-mid 跳转、中文输入法 Enter 守卫。

## HTTPS（语音/麦克风的线上前提）
裸 `http://44.226.3.135:3000` 下 `getUserMedia`/`MediaRecorder`/`SpeechRecognition` 全部 undefined。
线上启用麦克风类功能需 HTTPS：Lightsail 开 80/443 → `deploy/Caddyfile` 域名换 `44-226-3-135.sslip.io`
（sslip.io 把 IP 编进域名自动解析，Caddy 即可签真 Let's Encrypt 证书）→ `systemctl restart caddy`。
其余全部功能（消息交互/typing/已读/会议在场/通知声/打磨）裸 http 即可用。

## 文件
- 数据：`prisma/schema.prisma`（Message/GroupMessage 加 editedAt/deleted/replyToId/updatedAt；
  新 MessageReaction/ChatSignal/VoiceParticipant）+ `migrations/20260613200000_chat_round1`
- 服务：`chat-interactions.ts`（反应/编辑/删除/变更游标）、`signal-service.ts`（typing/已读）、
  `voice-room-service.ts`（在场）、`message-service.ts`/`group-service.ts`（reply/mutations 查询）
- 接线：`friends-actions.ts`（poll 扩展 + 新 actions）
- UI：`social-layer.tsx`（patchMessage/poll/通知声/交互 handler）、`chat-window.tsx`（输入/录音/voiceroom/拖拽/滚动）、
  `message-list.tsx`（富消息渲染：反应/引用/编辑/语音/linkify/已读）、`emoji-picker.tsx`、`presence.ts`（类型+语音/emoji 工具）

## 后续（更大改造）
WebRTC P2P 音频（2 人 demo → ≤4 人 mesh，信令复用 poll）、服务端 Whisper STT（转历史语音）、
群已读、置顶、跨历史搜索、@everyone、OG 链接预览、附件迁对象存储。
