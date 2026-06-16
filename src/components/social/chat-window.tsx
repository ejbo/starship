"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  Bell,
  BellOff,
  Bot,
  Check,
  ChevronDown,
  ChevronsRight,
  Copy,
  CornerUpLeft,
  Cpu,
  Download,
  FileText,
  Hash,
  Headphones,
  Mic,
  MicOff,
  Paperclip,
  Phone,
  PhoneOff,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  SmilePlus,
  Square,
  Trash2,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { createChannelAction } from "@/app/friends-actions";
import { getAgentDetailAction, updateAgentSettingsAction } from "@/app/agents-actions";
import { HOSTED_PROVIDERS, MODEL_SUGGESTIONS, PROVIDER_LABELS } from "@/lib/agent-shared";
import { GroupSettingsModal } from "./group-settings-modal";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { GroupMember, GroupSummary } from "@/lib/group-service";
import type { MessageKind } from "@/lib/message-service";
import type { VoiceRoomSnapshot } from "@/lib/voice-room-service";
import type { Friend, PresenceKind } from "@/lib/types";
import { GroupAvatar, type Me } from "./friends-panel";
import { EmojiPicker } from "./emoji-picker";
import { MessageList } from "./message-list";
import { miniProfileProps } from "./mini-profile";
import {
  blobToDataUrl,
  canRecordVoice,
  display,
  fileToDataUrl,
  formatDuration,
  getSpeechRecognition,
  imageToDataUrl,
  messageTimeLabel,
  pickAudioMime,
  presenceMeta,
  statusText,
  QUICK_REACTIONS,
  VOICE_NAME_PREFIX,
  type Conversation,
  type ReplyPreview,
  type ViewMessage,
} from "./presence";

// —— 聊天标签 key：好友 = handle；群组 = "g:<groupId>" ——
export const groupKey = (id: string) => `g:${id}`;
export const isGroupKey = (k: string) => k.startsWith("g:");
export const groupIdOf = (k: string) => k.slice(2);
// —— 会话 key：好友 = handle；群组频道 = "c:<channelId>"（与 social-layer 的 conversations 字典一致） ——
export const channelConvKey = (channelId: string) => `c:${channelId}`;
export const isChannelConvKey = (k: string) => k.startsWith("c:");
export const channelIdOf = (k: string) => k.slice(2);

const MIN_W = 320;
const MIN_H = 360;
type Corner = "nw" | "ne" | "sw" | "se";

export interface SendPayload {
  kind: MessageKind;
  attachmentUrl?: string;
  attachmentName?: string;
  replyToId?: string;
}

interface ChatWindowProps {
  me: Me;
  myPresence: Me["presence"];
  friends: Friend[];
  groups: GroupSummary[];
  openChats: string[];
  activeChat: string | null;
  conversations: Record<string, Conversation>;
  unread: Record<string, number>;
  /** convKey（好友 handle / 频道 id）→ 未读分隔线所在消息 id */
  markers: Record<string, string | null>;
  /** groupId → 当前选中频道 id */
  channelSel: Record<string, string>;
  mutedGroups: Set<string>;
  mutedChannels: Set<string>;
  /** convKey → 正在输入的人 */
  typing: Record<string, { handle: string; name: string }[]>;
  /** DM convKey → 对方已读到的消息时刻 */
  reads: Record<string, string>;
  /** roomId(语音频道) → 在场成员 */
  voiceRooms: Record<string, VoiceRoomSnapshot["members"]>;
  /** 我加入的语音房间 id */
  myVoiceRoom: string | null;
  onActivate: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseWindow: () => void;
  onSend: (convKey: string, body: string, input?: SendPayload) => void;
  onLoadOlder: (convKey: string) => Promise<boolean>;
  onSelectChannel: (groupId: string, channelId: string) => void;
  /** groupId 为空 = 从私聊发起建群（预选当前好友） */
  onInvite: (groupId: string | null, preselect: string[]) => void;
  onToggleMute: (groupId: string) => void;
  onToggleMuteChannel: (channelId: string) => void;
  onOpenChat: (handle: string) => void;
  onGroupsChanged: () => Promise<unknown>;
  onReact: (convKey: string, messageId: string, emoji: string) => void;
  onEdit: (convKey: string, messageId: string, body: string) => void;
  onDelete: (convKey: string, messageId: string) => void;
  onTyping: (convKey: string) => void;
  onRead: (convKey: string) => void;
  onJoinVoice: (roomId: string) => void;
  onLeaveVoice: (roomId: string) => void;
  onToggleMic: (roomId: string, micOn: boolean) => void;
}

export function ChatWindow(props: ChatWindowProps) {
  const { me, myPresence, friends, groups, openChats, activeChat, conversations, unread, markers, channelSel, mutedGroups } = props;

  const [drafts, setDrafts] = useState<Record<string, string>>({}); // 草稿按会话隔离，切 tab 不串
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [replyTargets, setReplyTargets] = useState<Record<string, ReplyPreview & { senderName: string }>>({}); // 每会话的回复目标
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const dragCounter = useRef(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 720, h: 520 });
  const posRef = useRef(pos);
  posRef.current = pos;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const resizeRef = useRef<{ corner: Corner; mx: number; my: number; pos: { x: number; y: number }; size: { w: number; h: number } } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const prevHeightRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 录音相关 ref（必须在早退 return 之前声明，保持 hooks 顺序稳定）
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recStartRef = useRef(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef("");
  const cancelRef = useRef(false);

  const flashHint = (text: string) => {
    setHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2200);
  };

  const friendOf = (h: string) => friends.find((f) => f.handle === h);
  const groupOf = (k: string) => groups.find((g) => g.id === groupIdOf(k));

  const activeIsGroup = !!activeChat && isGroupKey(activeChat);
  const activeFriend = activeChat && !activeIsGroup ? friendOf(activeChat) : null;
  const activeGroup = activeChat && activeIsGroup ? groupOf(activeChat) : null;
  // 所选频道可能已被删除：校验后回退到第一个文字频道（与 social-layer 的 currentChannelId 一致）
  const selectedChannel = activeGroup ? channelSel[activeGroup.id] : undefined;
  const activeChannelId = activeGroup
    ? (selectedChannel && activeGroup.channels.some((c) => c.id === selectedChannel) ? selectedChannel : activeGroup.channels.find((c) => c.kind === "text")?.id) ?? null
    : null;
  const convKey = activeIsGroup ? (activeChannelId ? channelConvKey(activeChannelId) : null) : activeChat;
  const conv = convKey ? conversations[convKey] : undefined;
  const messages = conv?.messages ?? [];
  const draft = convKey ? drafts[convKey] ?? "" : "";
  const setDraft = (v: string) => {
    if (convKey) setDrafts((d) => ({ ...d, [convKey]: v }));
  };

  // 输入框随行数增高，到上限（128px）后内部滚动
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  // 初始位置/尺寸：localStorage 记忆优先
  useEffect(() => {
    let w = Math.min(880, window.innerWidth - 48);
    let h = Math.min(720, window.innerHeight - 48);
    try {
      const savedSize = localStorage.getItem("starport_chat_size");
      if (savedSize) {
        const s = JSON.parse(savedSize);
        w = Math.max(MIN_W, Math.min(s.w, window.innerWidth - 16));
        h = Math.max(MIN_H, Math.min(s.h, window.innerHeight - 16));
      }
    } catch {
      /* ignore */
    }
    setSize({ w, h });
    try {
      const saved = localStorage.getItem("starport_chat_pos");
      if (saved) {
        const p = JSON.parse(saved);
        setPos({ x: Math.min(Math.max(8, p.x), window.innerWidth - w - 8), y: Math.min(Math.max(8, p.y), window.innerHeight - h - 8) });
        return;
      }
    } catch {
      /* ignore */
    }
    setPos({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切换会话/频道 → 滚到底 + 输入框高度按该会话草稿重算 + 标记已读
  useEffect(() => {
    atBottomRef.current = true;
    setShowScrollDown(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    autoGrow();
    if (convKey) props.onRead(convKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convKey]);

  // 在底部时来新消息 → 自动标记已读
  useEffect(() => {
    if (convKey && atBottomRef.current) props.onRead(convKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // 消息变化：加载历史时维持位置，否则（在底部时）滚到底
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loadingOlderRef.current) {
      el.scrollTop = el.scrollHeight - prevHeightRef.current;
      loadingOlderRef.current = false;
    } else if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // 图片放大 ESC 关闭
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (openChats.length === 0 || !pos) return null;

  const winStyle = { left: pos.x, top: pos.y, width: size.w, height: size.h };
  const showChannels = size.w >= 520;
  const showMembers = membersOpen && size.w >= 660;

  // —— 拖动 ——
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const x = Math.min(Math.max(8, e.clientX - dragRef.current.dx), window.innerWidth - size.w - 8);
    const y = Math.min(Math.max(8, e.clientY - dragRef.current.dy), window.innerHeight - size.h - 8);
    setPos({ x, y });
  };
  const onDragEnd = () => {
    if (dragRef.current && posRef.current) {
      try {
        localStorage.setItem("starport_chat_pos", JSON.stringify(posRef.current));
      } catch {
        /* ignore */
      }
    }
    dragRef.current = null;
  };

  // —— 四角缩放 ——
  const startResize = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    resizeRef.current = { corner, mx: e.clientX, my: e.clientY, pos: { ...pos }, size: { ...size } };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const dx = e.clientX - r.mx;
    const dy = e.clientY - r.my;
    let x = r.pos.x;
    let y = r.pos.y;
    let w = r.size.w;
    let h = r.size.h;
    if (r.corner.includes("e")) w = r.size.w + dx;
    if (r.corner.includes("s")) h = r.size.h + dy;
    if (r.corner.includes("w")) { w = r.size.w - dx; x = r.pos.x + dx; }
    if (r.corner.includes("n")) { h = r.size.h - dy; y = r.pos.y + dy; }
    if (w < MIN_W) { if (r.corner.includes("w")) x = r.pos.x + (r.size.w - MIN_W); w = MIN_W; }
    if (h < MIN_H) { if (r.corner.includes("n")) y = r.pos.y + (r.size.h - MIN_H); h = MIN_H; }
    w = Math.min(w, window.innerWidth - 16);
    h = Math.min(h, window.innerHeight - 16);
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    setPos({ x, y });
    setSize({ w, h });
  };
  const onResizeEnd = () => {
    if (resizeRef.current) {
      try {
        localStorage.setItem("starport_chat_pos", JSON.stringify(posRef.current));
        localStorage.setItem("starport_chat_size", JSON.stringify(sizeRef.current));
      } catch {
        /* ignore */
      }
    }
    resizeRef.current = null;
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || !convKey) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    atBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
    if (atBottom) props.onRead(convKey); // 看到底即已读
    if (el.scrollTop < 60 && conv?.hasMore && !loadingOlderRef.current) {
      loadingOlderRef.current = true;
      prevHeightRef.current = el.scrollHeight;
      props
        .onLoadOlder(convKey)
        .then((ok) => {
          if (!ok) loadingOlderRef.current = false;
        })
        .catch(() => {
          loadingOlderRef.current = false; // 网络失败别把标志卡死
        });
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const send = () => {
    const body = draft.trim();
    if (!body || !convKey) return;
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
    atBottomRef.current = true;
    props.onSend(convKey, body, replyTarget ? { kind: "text", replyToId: replyTarget.id } : undefined);
    setReplyTarget(null);
  };

  const sendAttachment = async (file: File) => {
    if (!convKey) return;
    try {
      if (file.type.startsWith("image/") && file.type !== "image/gif") {
        const dataUrl = await imageToDataUrl(file);
        atBottomRef.current = true;
        props.onSend(convKey, "", { kind: "image", attachmentUrl: dataUrl });
        return;
      }
      if (file.size > 2_000_000) {
        flashHint("文件过大（上限 2MB）");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      atBottomRef.current = true;
      if (file.type === "image/gif") props.onSend(convKey, "", { kind: "image", attachmentUrl: dataUrl });
      else props.onSend(convKey, file.name, { kind: "file", attachmentUrl: dataUrl, attachmentName: file.name });
    } catch {
      /* ignore */
    }
  };

  // —— 语音消息录制（+ 浏览器原生边录边转文字） ——
  const MAX_VOICE_SEC = 120;

  const cleanupRec = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recTimerRef.current = null;
    recStreamRef.current?.getTracks().forEach((t) => t.stop());
    recStreamRef.current = null;
    try {
      speechRef.current?.stop();
    } catch {
      /* ignore */
    }
    speechRef.current = null;
  };

  const startRecording = async () => {
    if (!convKey) return;
    if (!canRecordVoice()) {
      flashHint(window.isSecureContext ? "此浏览器不支持录音" : "录音需在 HTTPS 环境（联系管理员开启）");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recStreamRef.current = stream;
      transcriptRef.current = "";
      cancelRef.current = false;
      const mime = pickAudioMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : undefined);
      recChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        const sec = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
        cleanupRec();
        setRecording(false);
        if (cancelRef.current || recChunksRef.current.length === 0) return;
        const blob = new Blob(recChunksRef.current, { type: mime || "audio/webm" });
        if (blob.size > 2_900_000) {
          flashHint("语音过长（超 2MB），请缩短");
          return;
        }
        try {
          const dataUrl = await blobToDataUrl(blob);
          atBottomRef.current = true;
          props.onSend(convKey, transcriptRef.current.trim(), { kind: "voice", attachmentUrl: dataUrl, attachmentName: `${VOICE_NAME_PREFIX}${sec}` });
        } catch {
          flashHint("语音处理失败");
        }
      };
      recRef.current = rec;
      recStartRef.current = Date.now();
      rec.start();
      setRecording(true);
      setRecordSec(0);
      recTimerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - recStartRef.current) / 1000);
        setRecordSec(s);
        if (s >= MAX_VOICE_SEC) stopRecording(true);
      }, 250);

      // 边录边转文字（Chrome/Edge；不可用静默跳过）
      const SR = getSpeechRecognition();
      if (SR) {
        try {
          const r = new (SR as new () => {
            lang: string;
            continuous: boolean;
            interimResults: boolean;
            onresult: (e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void;
            start: () => void;
            stop: () => void;
          })();
          r.lang = "zh-CN";
          r.continuous = true;
          r.interimResults = false;
          r.onresult = (e) => {
            let t = "";
            for (let i = 0; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
            if (t) transcriptRef.current = t;
          };
          r.start();
          speechRef.current = { stop: () => r.stop() };
        } catch {
          /* 识别不可用，忽略 */
        }
      }
    } catch {
      cleanupRec();
      flashHint("无法访问麦克风");
    }
  };

  const stopRecording = (sendIt: boolean) => {
    cancelRef.current = !sendIt;
    try {
      recRef.current?.stop();
    } catch {
      cleanupRec();
      setRecording(false);
    }
  };

  // 粘贴图片直接发送
  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith("image/")) {
        const file = it.getAsFile();
        if (file) {
          e.preventDefault();
          sendAttachment(file);
          return;
        }
      }
    }
  };

  const marker = convKey ? markers[convKey] : null;
  const cornerCls = "absolute z-10 size-3.5";
  const replyTarget = convKey ? replyTargets[convKey] : undefined;
  const setReplyTarget = (t: (ReplyPreview & { senderName: string }) | null) => {
    if (!convKey) return;
    setReplyTargets((cur) => {
      const next = { ...cur };
      if (t) next[convKey] = t;
      else delete next[convKey];
      return next;
    });
  };

  const jumpTo = (id: string) => {
    const el = scrollRef.current?.querySelector(`[data-mid="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent/40", "rounded-md");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent/40", "rounded-md"), 1400);
    }
  };

  // —— 群聊 @ 自动补全（输入 @ 弹出成员候选，agents 优先；Enter/Tab/点击插入） ——
  const mentionMatch = activeGroup ? /@([^\s@]*)$/.exec(draft) : null;
  const mentionCandidates =
    mentionMatch && activeGroup
      ? activeGroup.members
          .filter((m) => !m.isMe)
          .filter((m) => {
            const q = mentionMatch[1].toLowerCase();
            if (q === m.handle.toLowerCase() || mentionMatch[1] === m.name) return false; // 已输完整名则不打扰发送
            return !q || m.handle.toLowerCase().startsWith(q) || m.name.toLowerCase().includes(q) || display(m).toLowerCase().includes(q);
          })
          .sort((a, b) => Number(b.isAgent ?? false) - Number(a.isAgent ?? false))
          .slice(0, 6)
      : [];
  const insertMention = (handle: string) => {
    if (!mentionMatch) return;
    setDraft(draft.slice(0, mentionMatch.index) + `@${handle} `);
    taRef.current?.focus();
  };

  const placeholder = activeFriend ? `发消息给 ${display(activeFriend)}` : activeGroup ? `发消息到 #${activeGroup.channels.find((c) => c.id === activeChannelId)?.name ?? ""}` : "";

  const typers = convKey ? props.typing[convKey] ?? [] : [];
  const peerReadAt = activeFriend && convKey ? props.reads[convKey] ?? null : null;
  // Agent「已收到，正在生成」指示：基于 agent 活动态（presence=using，由连接器/托管在处理任务时上报）
  const workingAgents: Friend[] = activeIsGroup
    ? (activeGroup?.members ?? []).filter((m) => m.isAgent && m.presence.kind === "using")
    : activeFriend?.isAgent && activeFriend.presence.kind === "using"
      ? [activeFriend]
      : [];

  const messageArea = (
    <div ref={scrollRef} onScroll={onScroll} className="relative grow space-y-1 overflow-y-auto bg-page/40 px-3 py-3">
      {conv?.hasMore && <p className="py-1 text-center text-[10px] text-mute">上滑加载更早的消息…</p>}
      {messages.length === 0 ? (
        <p className="pt-8 text-center text-xs text-mute">{conv?.loaded ? "还没有聊天记录，打个招呼吧" : "加载中…"}</p>
      ) : (
        convKey && (
          <MessageList
            messages={messages}
            me={me}
            isGroup={activeIsGroup}
            marker={marker}
            friends={friends}
            members={activeGroup?.members ?? []}
            dmFriend={activeFriend ?? null}
            peerReadAt={peerReadAt}
            onImage={setLightbox}
            onReact={(id, emoji) => props.onReact(convKey, id, emoji)}
            onReply={(m) => setReplyTarget({ id: m.id, senderName: m.sender.handle === me.handle ? me.name : m.sender.name, excerpt: m.deleted ? "已删除的消息" : m.kind === "voice" ? "[语音]" : m.kind === "image" ? "[图片]" : m.kind === "file" ? "[文件]" : m.body.slice(0, 60), kind: m.kind })}
            onEditCommit={(id, body) => props.onEdit(convKey, id, body)}
            onDelete={(id) => props.onDelete(convKey, id)}
            onJumpTo={jumpTo}
          />
        )
      )}
      {typers.length > 0 && <TypingBubble typers={typers} isGroup={activeIsGroup} />}
      {workingAgents.length > 0 && <AgentWorkingBubble agents={workingAgents} />}
    </div>
  );

  const inputBar = (
    <div className="relative border-t border-line p-2">
      {emojiOpen && (
        <div className="absolute bottom-full left-2 z-10 mb-1">
          <EmojiPicker onPick={(em) => { setDraft(draft + em); setEmojiOpen(false); taRef.current?.focus(); }} />
        </div>
      )}
      {hint && <p className="absolute -top-7 left-2 z-10 rounded-md bg-ink/80 px-2 py-1 text-[11px] text-white">{hint}</p>}
      {mentionCandidates.length > 0 && (
        <div className="absolute bottom-full left-2 z-10 mb-1 w-60 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]">
          {mentionCandidates.map((m, i) => (
            <button
              key={m.handle}
              onClick={() => insertMention(m.handle)}
              className={cn("flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-card-hi", i === 0 && "bg-card-hi/60")}
            >
              <Avatar name={display(m)} hue={m.avatarHue} src={m.avatarUrl} size="xs" />
              <span className="min-w-0 truncate text-sm">{m.name}</span>
              {m.isAgent && <Bot className="size-3 shrink-0 text-green" />}
              <span className="ml-auto shrink-0 text-[10px] text-mute">@{m.handle}</span>
            </button>
          ))}
        </div>
      )}

      {/* 回复预览条 */}
      {replyTarget && (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-2 border-accent bg-card-hi/60 px-2.5 py-1.5 text-xs">
          <CornerUpLeft className="size-3.5 shrink-0 text-accent" />
          <span className="min-w-0 truncate text-dim">
            回复 <span className="font-medium text-ink">{replyTarget.senderName}</span>：{replyTarget.excerpt}
          </span>
          <button onClick={() => setReplyTarget(null)} className="ml-auto rounded p-0.5 text-mute hover:text-ink" aria-label="取消回复">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 录音中：整条输入区变为录音控件 */}
      {recording ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2">
          <span className="flex size-2.5 animate-pulse rounded-full bg-danger" />
          <span className="text-sm text-danger">录音中 {formatDuration(recordSec)}</span>
          <span className="text-[11px] text-mute">{getSpeechRecognition() ? "· 同步转文字" : ""}</span>
          <button onClick={() => stopRecording(false)} className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs text-dim transition-colors hover:bg-card-hi" title="取消">
            取消
          </button>
          <button onClick={() => stopRecording(true)} className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep">
            <Send className="size-3" /> 发送
          </button>
        </div>
      ) : (
        <div className="flex items-end gap-1.5">
          <div className="flex grow items-end gap-1.5 rounded-lg border border-line bg-page px-2 py-1 focus-within:border-accent">
            <textarea
              ref={taRef}
              value={draft}
              rows={1}
              onChange={(e) => {
                setDraft(e.target.value);
                autoGrow();
                if (convKey && e.target.value.trim()) props.onTyping(convKey);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
                  if (mentionCandidates.length > 0) {
                    e.preventDefault();
                    insertMention(mentionCandidates[0].handle);
                    return;
                  }
                  if (e.key === "Tab") return;
                  e.preventDefault();
                  send();
                }
                if (e.key === "Escape" && replyTarget) setReplyTarget(null);
              }}
              onPaste={onPaste}
              placeholder={placeholder}
              className="max-h-32 grow resize-none overflow-y-auto bg-transparent px-1 py-1 text-sm leading-relaxed focus:outline-none"
            />
            <button onClick={send} disabled={!draft.trim()} className="rounded-md p-1.5 text-accent transition-colors hover:bg-card-hi disabled:opacity-35" aria-label="发送" title="发送（Enter）">
              <Send className="size-4" />
            </button>
          </div>
          <button onClick={() => setEmojiOpen((o) => !o)} className="rounded-lg border border-line p-2 text-dim transition-colors hover:bg-card-hi hover:text-ink" title="表情" aria-label="表情">
            <Smile className="size-4" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="rounded-lg border border-line p-2 text-dim transition-colors hover:bg-card-hi hover:text-ink" title="发送图片或文件" aria-label="发送图片或文件">
            <Paperclip className="size-4" />
          </button>
          <button onClick={startRecording} className="rounded-lg border border-line p-2 text-dim transition-colors hover:bg-card-hi hover:text-ink" title="语音消息" aria-label="语音消息">
            <Mic className="size-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendAttachment(f);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );

  const scrollDownBtn = showScrollDown && (
    <button
      onClick={scrollToBottom}
      className="absolute bottom-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border border-line bg-panel text-dim shadow-md transition-colors hover:text-accent"
      title="回到底部"
      aria-label="回到底部"
    >
      <ArrowDown className="size-4" />
    </button>
  );

  // 拖拽上传：dragCounter 防子元素进出乱触发
  const onDragEnter = (e: React.DragEvent) => {
    if (!convKey || !e.dataTransfer?.types.includes("Files")) return;
    dragCounter.current++;
    setDragOver(true);
  };
  const onDragLeave = () => {
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    if (!convKey) return;
    const files = Array.from(e.dataTransfer?.files ?? []);
    files.forEach((f) => void sendAttachment(f));
  };

  return (
    <>
      <div
        className="fixed z-40 flex flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_50px_-12px_rgb(28_36_51/.32)]"
        style={winStyle}
        onDragEnter={onDragEnter}
        onDragOver={(e) => convKey && e.dataTransfer?.types.includes("Files") && e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-[60] m-2 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-accent/10 text-sm font-medium text-accent">
            松手发送文件
          </div>
        )}
        {/* tab 栏（拖动手柄 + 窗口控制） */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          className="flex cursor-move touch-none items-stretch border-b border-line bg-card-hi"
        >
          <div className="flex grow items-stretch gap-px overflow-x-auto">
            {openChats.map((key) => {
              const isActive = key === activeChat;
              const count = unread[key] ?? 0;
              if (isGroupKey(key)) {
                const g = groupOf(key);
                if (!g) return null;
                return (
                  <ChatTab key={key} isActive={isActive} unread={count} onClick={() => props.onActivate(key)} onClose={() => props.onCloseTab(key)}>
                    <GroupAvatar group={g} size="xs" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[13px]">{g.name}</span>
                      {isActive && <span className="block truncate text-[10px] font-normal text-mute">{g.members.length} 名成员</span>}
                    </span>
                  </ChatTab>
                );
              }
              const f = friendOf(key);
              if (!f) return null;
              const pm = presenceMeta[f.presence.kind];
              return (
                <ChatTab key={key} isActive={isActive} unread={count} onClick={() => props.onActivate(key)} onClose={() => props.onCloseTab(key)}>
                  <span className="relative shrink-0">
                    <Avatar name={display(f)} hue={f.avatarHue} src={f.avatarUrl} size="xs" />
                    <span className={cn("absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-card-hi", pm.dot)} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className={cn("block truncate text-[13px]", f.presence.kind === "using" && "text-green")}>{display(f)}</span>
                    <span className={cn("block truncate text-[10px] font-normal", pm.tone)}>{statusText(f)}</span>
                  </span>
                </ChatTab>
              );
            })}
          </div>
          <div className="flex items-center px-1" onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={props.onCloseWindow} className="rounded p-1.5 text-mute transition-colors hover:bg-danger/10 hover:text-danger" title="关闭" aria-label="关闭">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* —— 私聊 —— */}
        {activeFriend && (
          <>
            {/* Agent 私聊：常驻状态条，离线本地 agent 明确告知「消息已排队，连接器上线后处理」 */}
            {activeFriend.isAgent && (
              <div className="flex items-center gap-1.5 border-b border-line bg-card-hi/50 px-3 py-1.5 text-[11px]">
                <Bot className={cn("size-3.5", activeFriend.presence.kind === "offline" ? "text-mute" : "text-green")} />
                {activeFriend.presence.kind === "offline" && activeFriend.agentKind !== "hosted" ? (
                  <span className="text-mute">连接器未运行 · 消息已排队，启动后会处理</span>
                ) : (
                  <span className={cn(presenceMeta[activeFriend.presence.kind].tone)}>{statusText(activeFriend)}</span>
                )}
                <AgentModelSwitcher friend={activeFriend} />
              </div>
            )}
            <div className="relative flex min-h-0 grow flex-col">
              {messageArea}
              {scrollDownBtn}
              {/* 右上角：邀请组建群聊（Steam +👤），悬浮不随消息滚动 */}
              <button
                onClick={() => props.onInvite(null, [activeFriend.handle])}
                className="absolute right-2 top-2 rounded-full border border-line bg-panel p-2 text-dim shadow-sm transition-colors hover:text-accent"
                title="邀请更多好友，组成群组聊天"
                aria-label="邀请到群组聊天"
              >
                <UserPlus className="size-4" />
              </button>
            </div>
            {inputBar}
          </>
        )}

        {/* —— 群组聊天 —— */}
        {activeGroup && (
          <>
            <GroupHeader
              group={activeGroup}
              muted={mutedGroups.has(activeGroup.id)}
              settingsOpen={settingsOpen}
              onToggleSettings={() => setSettingsOpen((o) => !o)}
              onToggleMute={() => props.onToggleMute(activeGroup.id)}
              onInvite={() => props.onInvite(activeGroup.id, [])}
              onToggleMembers={() => setMembersOpen((o) => !o)}
            />
            {settingsOpen && (
              <GroupSettingsModal
                group={activeGroup}
                meHandle={me.handle}
                onClose={() => setSettingsOpen(false)}
                onChanged={props.onGroupsChanged}
              />
            )}
            <div className="flex min-h-0 grow items-stretch">
              {showChannels && (
                <ChannelSidebar
                  group={activeGroup}
                  activeChannelId={activeChannelId}
                  unread={unread}
                  mutedChannels={props.mutedChannels}
                  voiceRooms={props.voiceRooms}
                  myVoiceRoom={props.myVoiceRoom}
                  onSelect={(cid) => props.onSelectChannel(activeGroup.id, cid)}
                  onToggleMuteChannel={props.onToggleMuteChannel}
                  onJoinVoice={props.onJoinVoice}
                  onLeaveVoice={props.onLeaveVoice}
                  onToggleMic={props.onToggleMic}
                  onCreated={props.onGroupsChanged}
                />
              )}
              <div className="relative flex min-w-0 grow flex-col border-l border-line">
                {(() => {
                  const ch = activeGroup.channels.find((c) => c.id === activeChannelId);
                  return ch?.topic ? (
                    <div className="flex items-center gap-1.5 border-b border-line bg-card-hi/30 px-3 py-1 text-[11px] text-mute">
                      <Hash className="size-3 shrink-0" />
                      <span className="truncate">{ch.topic}</span>
                    </div>
                  ) : null;
                })()}
                {messageArea}
                {scrollDownBtn}
                {inputBar}
              </div>
              {showMembers && (
                <MemberList group={activeGroup} me={me} onOpenChat={props.onOpenChat} onCollapse={() => setMembersOpen(false)} />
              )}
            </div>
          </>
        )}

        {/* 四角缩放手柄 */}
        <div onPointerDown={startResize("nw")} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} className={cn(cornerCls, "left-0 top-0 cursor-nwse-resize")} />
        <div onPointerDown={startResize("ne")} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} className={cn(cornerCls, "right-0 top-0 cursor-nesw-resize")} />
        <div onPointerDown={startResize("sw")} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} className={cn(cornerCls, "bottom-0 left-0 cursor-nesw-resize")} />
        <div onPointerDown={startResize("se")} onPointerMove={onResizeMove} onPointerUp={onResizeEnd} className={cn(cornerCls, "bottom-0 right-0 cursor-nwse-resize")}>
          <span className="absolute bottom-0.5 right-0.5 block size-1.5 rounded-sm border-b-2 border-r-2 border-mute/50" />
        </div>
      </div>

      {/* 图片放大 popup */}
      {lightbox && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-6" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="放大查看" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
          <button onClick={() => setLightbox(null)} className="absolute right-5 top-5 rounded-full bg-white/15 p-2 text-white transition-colors hover:bg-white/25" aria-label="关闭">
            <X className="size-5" />
          </button>
        </div>
      )}
    </>
  );
}

function ChatTab({
  isActive,
  unread,
  onClick,
  onClose,
  children,
}: {
  isActive: boolean;
  unread: number;
  onClick: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
        isActive ? "max-w-[14rem] bg-panel font-medium text-ink" : "max-w-[10rem] text-dim hover:bg-panel/60",
      )}
    >
      {children}
      {unread > 0 && !isActive && (
        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">{Math.min(unread, 99)}</span>
      )}
      <span
        role="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-0.5 rounded p-0.5 text-mute opacity-0 transition-opacity hover:bg-card-hi hover:text-ink group-hover:opacity-100"
      >
        <X className="size-3" />
      </span>
    </div>
  );
}

// ———————————————————— 群组头部 ————————————————————
function GroupHeader({
  group,
  muted,
  settingsOpen,
  onToggleSettings,
  onToggleMute,
  onInvite,
  onToggleMembers,
}: {
  group: GroupSummary;
  muted: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleMute: () => void;
  onInvite: () => void;
  onToggleMembers: () => void;
}) {
  const usingCount = group.members.filter((m) => m.presence.kind === "using" || m.presence.kind === "meeting").length;
  const onlineCount = group.members.filter((m) => m.presence.kind === "online").length;
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-3 py-2">
      <GroupAvatar group={group} />
      <p className="min-w-0 truncate text-sm font-semibold">{group.name}</p>
      <button onClick={onToggleMembers} className="ml-auto flex shrink-0 items-center gap-2.5 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-card-hi" title="显示/隐藏成员列表">
        {usingCount > 0 && (
          <span className="flex items-center gap-1 text-green">
            <span className="size-1.5 rounded-full bg-green" /> {usingCount}
          </span>
        )}
        {onlineCount > 0 && (
          <span className="flex items-center gap-1 text-accent">
            <span className="size-1.5 rounded-full bg-accent" /> {onlineCount}
          </span>
        )}
        <span className="flex items-center gap-1 text-mute">
          <span className="size-1.5 rounded-full bg-mute" /> {group.members.length} 名成员
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5">
        <button onClick={onToggleMute} className="rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" title={muted ? "取消免打扰" : "免打扰（不弹新消息提醒）"} aria-label="通知设置">
          {muted ? <BellOff className="size-4 text-mute" /> : <Bell className="size-4" />}
        </button>
        <button onClick={onInvite} className="rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" title="邀请好友加入" aria-label="邀请好友加入">
          <UserPlus className="size-4" />
        </button>
        <button
          onClick={onToggleSettings}
          className={cn("rounded-lg p-1.5 transition-colors hover:bg-card-hi hover:text-ink", settingsOpen ? "text-accent" : "text-dim")}
          title="群组设置"
          aria-label="群组设置"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ———————————————————— 频道栏 ————————————————————
function ChannelSidebar({
  group,
  activeChannelId,
  unread,
  mutedChannels,
  voiceRooms,
  myVoiceRoom,
  onSelect,
  onToggleMuteChannel,
  onJoinVoice,
  onLeaveVoice,
  onToggleMic,
  onCreated,
}: {
  group: GroupSummary;
  activeChannelId: string | null;
  unread: Record<string, number>;
  mutedChannels: Set<string>;
  voiceRooms: Record<string, VoiceRoomSnapshot["members"]>;
  myVoiceRoom: string | null;
  onSelect: (channelId: string) => void;
  onToggleMuteChannel: (channelId: string) => void;
  onJoinVoice: (roomId: string) => void;
  onLeaveVoice: (roomId: string) => void;
  onToggleMic: (roomId: string, micOn: boolean) => void;
  onCreated: () => Promise<unknown>;
}) {
  const [adding, setAdding] = useState<"text" | "voice" | null>(null);
  const [name, setName] = useState("");
  const texts = group.channels.filter((c) => c.kind === "text");
  const voices = group.channels.filter((c) => c.kind === "voice");

  const submit = async () => {
    const kind = adding;
    const n = name.trim();
    setAdding(null);
    setName("");
    if (!n || !kind) return;
    const res = await createChannelAction(group.id, n, kind);
    await onCreated();
    if (res.ok && res.channel && kind === "text") onSelect(res.channel.id); // 建完直接进新频道
  };

  const addRow = (kind: "text" | "voice", label: string) =>
    adding === kind ? (
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setAdding(null);
            setName("");
          }
        }}
        onBlur={submit}
        maxLength={20}
        placeholder="频道名…"
        className="mx-1 my-0.5 w-[calc(100%-0.5rem)] rounded-md border border-accent bg-page px-2 py-1 text-xs focus:outline-none"
      />
    ) : (
      <button
        onClick={() => {
          setAdding(kind);
          setName("");
        }}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-mute transition-colors hover:bg-card-hi hover:text-dim"
      >
        <Plus className="size-3" /> {label}
      </button>
    );

  return (
    <div className="flex w-40 shrink-0 flex-col overflow-y-auto py-1.5">
      <p className="px-3 pb-1 pt-1 text-[10px] font-semibold tracking-wide text-mute">文字频道</p>
      {texts.map((c) => {
        const hasUnread = (unread[channelConvKey(c.id)] ?? 0) > 0 && c.id !== activeChannelId;
        const muted = mutedChannels.has(c.id);
        return (
          <div
            key={c.id}
            className={cn(
              "group/ch mx-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] transition-colors",
              c.id === activeChannelId ? "bg-card-hi font-medium text-ink" : "text-dim hover:bg-card-hi/60",
              hasUnread && "font-semibold text-ink",
            )}
          >
            <button onClick={() => onSelect(c.id)} className="flex min-w-0 grow items-center gap-1.5 text-left">
              <Hash className={cn("size-3.5 shrink-0", muted ? "text-mute/50" : "text-mute")} />
              <span className={cn("truncate", muted && "text-mute/60")}>{c.name}</span>
            </button>
            {hasUnread && !muted && <span className="size-1.5 shrink-0 rounded-full bg-accent" />}
            <button
              onClick={() => onToggleMuteChannel(c.id)}
              className={cn("shrink-0 rounded p-0.5 transition-colors hover:text-ink", muted ? "text-mute" : "text-mute opacity-0 group-hover/ch:opacity-100")}
              title={muted ? "取消免打扰" : "免打扰此频道（不弹提醒）"}
              aria-label="频道免打扰"
            >
              {muted ? <BellOff className="size-3" /> : <Bell className="size-3" />}
            </button>
          </div>
        );
      })}
      <div className="px-1">{addRow("text", "添加文字频道")}</div>
      <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-wide text-mute">语音频道</p>
      {voices.map((c) => {
        const members = voiceRooms[c.id] ?? [];
        const inThis = myVoiceRoom === c.id;
        return (
          <div key={c.id}>
            <div className="mx-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-dim">
              <Volume2 className="size-3.5 shrink-0 text-mute" />
              <span className="truncate">{c.name}</span>
              {members.length > 0 && <span className="text-[10px] text-mute">{members.length}</span>}
              {inThis ? (
                <button onClick={() => onLeaveVoice(c.id)} className="ml-auto rounded p-0.5 text-danger transition-colors hover:bg-danger/10" title="离开语音房间" aria-label="离开语音">
                  <PhoneOff className="size-3.5" />
                </button>
              ) : (
                <button onClick={() => onJoinVoice(c.id)} className="ml-auto rounded p-0.5 text-accent transition-colors hover:bg-accent/10" title="加入语音房间" aria-label="加入语音">
                  <Phone className="size-3.5" />
                </button>
              )}
            </div>
            {members.length > 0 && (
              <div className="mb-0.5 ml-5 space-y-0.5">
                {members.map((mem) => (
                  <div key={mem.handle} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px]">
                    <span className="relative">
                      <Avatar name={mem.name} hue={mem.avatarHue} src={mem.avatarUrl} size="xs" />
                      {mem.speaking && <span className="absolute inset-0 rounded-full ring-2 ring-green" />}
                    </span>
                    <span className="min-w-0 truncate text-dim">{mem.isMe ? "我" : mem.name}</span>
                    {mem.isMe ? (
                      <button onClick={() => onToggleMic(c.id, !mem.micOn)} className="ml-auto rounded p-0.5 text-mute hover:text-ink" title={mem.micOn ? "静音" : "取消静音"} aria-label="麦克风">
                        {mem.micOn ? <Mic className="size-3" /> : <MicOff className="size-3 text-danger" />}
                      </button>
                    ) : (
                      !mem.micOn && <MicOff className="ml-auto size-3 shrink-0 text-mute" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="px-1">{addRow("voice", "添加语音频道")}</div>
      {myVoiceRoom && voices.some((c) => c.id === myVoiceRoom) && (
        <p className="mx-1 mt-1 rounded bg-card-hi px-2 py-1 text-[10px] leading-relaxed text-mute">
          已加入语音房间（在场同步）。实时语音通话需 HTTPS，后续开放。
        </p>
      )}
    </div>
  );
}

// ———————————————————— 成员列表 ————————————————————
function MemberRow({ m, me, onOpenChat }: { m: GroupMember; me: Me; onOpenChat: (h: string) => void }) {
  const meta = presenceMeta[m.presence.kind];
  const offline = m.presence.kind === "offline";
  return (
    <button
      onDoubleClick={() => {
        if (m.isFriend && !m.isMe) onOpenChat(m.handle);
      }}
      onContextMenu={(e) => {
        if (m.isFriend && !m.isMe) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("starport:friend-menu", { detail: { friend: m, x: e.clientX, y: e.clientY } }));
        }
      }}
      // 好友行单击导航会打断双击开聊天，主页走右键菜单；非好友才用单击跳主页
      onClick={() => {
        if (!m.isFriend && !m.isMe) window.location.href = `/u/${m.handle}`;
      }}
      {...(m.isMe ? {} : miniProfileProps(m))}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
    >
      <span className="relative shrink-0">
        <Avatar name={display(m)} hue={m.avatarHue} src={m.avatarUrl} size="sm" className={cn(offline && "opacity-45")} />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn("flex items-center gap-1 truncate text-[13px]", offline ? "text-mute" : meta.tone)}>
          <span className="truncate">{m.isMe ? me.name : m.name}</span>
          {m.isAgent && <Bot className="size-3 shrink-0 opacity-70" />}
          {m.remark && <span className="shrink-0 text-[11px] text-dim">（{m.remark}）</span>}
          {m.isOwner && <span className="shrink-0 text-[10px] text-mute" title="群主">★</span>}
        </span>
        <span className={cn("block truncate text-[11px]", offline ? "text-mute" : meta.tone)}>{statusText(m)}</span>
      </span>
    </button>
  );
}

function MemberList({ group, me, onOpenChat, onCollapse }: { group: GroupSummary; me: Me; onOpenChat: (h: string) => void; onCollapse: () => void }) {
  const [filter, setFilter] = useState("");
  const match = (m: GroupMember) => display(m).includes(filter) || m.name.includes(filter) || m.handle.includes(filter);
  const inApp = group.members.filter((m) => (m.presence.kind === "using" || m.presence.kind === "meeting") && match(m));
  const rest = group.members.filter((m) => m.presence.kind !== "using" && m.presence.kind !== "meeting" && match(m));

  return (
    <div className="flex w-52 shrink-0 flex-col border-l border-line">
      <div className="flex items-center gap-1 px-2 pt-2">
        <button onClick={onCollapse} className="rounded-md p-1 text-mute transition-colors hover:bg-card-hi hover:text-ink" title="收起成员列表" aria-label="收起成员列表">
          <ChevronsRight className="size-3.5" />
        </button>
        <label className="flex grow items-center gap-1.5 rounded-md border border-line bg-page px-2 py-1 text-xs text-mute focus-within:border-accent">
          <Search className="size-3" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="按名字筛选" className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none" />
        </label>
      </div>
      <div className="grow overflow-y-auto px-1 pb-1.5 pt-1">
        {inApp.length > 0 && (
          <>
            <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold tracking-wide text-mute">正在使用 ({inApp.length})</p>
            {inApp.map((m) => (
              <MemberRow key={m.handle} m={m} me={me} onOpenChat={onOpenChat} />
            ))}
          </>
        )}
        <p className="px-2 pb-0.5 pt-1.5 text-[10px] font-semibold tracking-wide text-mute">群组成员 ({rest.length})</p>
        {rest.map((m) => (
          <MemberRow key={m.handle} m={m} me={me} onOpenChat={onOpenChat} />
        ))}
      </div>
    </div>
  );
}

// —— 正在输入指示（三点跳动） ——
function TypingBubble({ typers, isGroup }: { typers: { handle: string; name: string }[]; isGroup: boolean }) {
  const label = isGroup ? `${typers.slice(0, 2).map((t) => t.name).join("、")}${typers.length > 2 ? " 等" : ""} 正在输入` : "正在输入";
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-[11px] text-mute">
      <span className="flex gap-0.5">
        <span className="size-1.5 animate-bounce rounded-full bg-mute [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-mute [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-mute" />
      </span>
      {label}
    </div>
  );
}

// —— Agent 当前模型 chip + 随时切换面板 ——
function AgentModelSwitcher({ friend }: { friend: Friend }) {
  const isHosted = friend.agentKind === "hosted";
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [provider, setProvider] = useState(friend.agentProvider ?? "anthropic");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!loaded) {
      const r = await getAgentDetailAction(friend.handle);
      if (r.ok) {
        setProvider(r.detail.settings.provider);
        setModel(r.detail.settings.model ?? "");
        setLoaded(true);
      }
    }
  };
  const save = async () => {
    setBusy(true);
    await updateAgentSettingsAction(friend.handle, { settings: { provider, model: model.trim() || null } });
    setBusy(false);
    setOpen(false); // 约 2s 内 poll 会刷新头部模型显示
  };
  const sugg = MODEL_SUGGESTIONS[isHosted ? provider : friend.agentKind ?? ""] ?? [];

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={toggle}
        className="flex items-center gap-1 rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px] text-dim transition-colors hover:border-accent/50 hover:text-accent"
        title="点击切换模型"
      >
        <Cpu className="size-3" />
        <span className="max-w-[10rem] truncate font-mono">{friend.agentModel ?? "模型"}</span>
        <ChevronDown className="size-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-60 space-y-2 rounded-xl border border-line bg-panel p-2.5 shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]">
          <p className="text-[11px] font-medium text-dim">切换模型</p>
          {isHosted && (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-line bg-page px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            >
              {HOSTED_PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          )}
          <input
            value={model}
            list="switch-model-list"
            onChange={(e) => setModel(e.target.value)}
            placeholder={sugg[0] ? `默认 · 例 ${sugg[0]}` : "留空用默认"}
            className="w-full rounded-lg border border-line bg-page px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <datalist id="switch-model-list">
            {sugg.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {!isHosted && <p className="text-[10px] leading-relaxed text-mute">传给本地 CLI 的 --model；留空用 CLI 默认</p>}
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-lg bg-accent py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            {busy ? "切换中…" : "切换"}
          </button>
        </div>
      )}
    </div>
  );
}

// —— Agent「已收到，正在生成」状态条（绿色，带机器人图标 + 跳动点） ——
// 只显示通用文案，不渲染 presence.detail：detail 是 agent 的全局活动态，可能含「另一会话的消息预览」，
// 在群里原样展示会把第三方私聊内容泄露给无关成员。这里只表达「收到、正在生成」。
function AgentWorkingBubble({ agents }: { agents: Friend[] }) {
  const names = agents.map((a) => a.remark || a.name);
  const label =
    agents.length === 1
      ? `${names[0]} 正在生成回复…`
      : `${names.slice(0, 2).join("、")}${names.length > 2 ? " 等" : ""} 正在生成回复…`;
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-[11px] text-green">
      <Bot className="size-3.5 shrink-0" />
      <span className="flex gap-0.5">
        <span className="size-1.5 animate-bounce rounded-full bg-green [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-green [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-green" />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
