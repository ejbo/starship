"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Bot,
  ChevronsRight,
  Download,
  FileText,
  Hash,
  LogOut,
  Mic,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { createChannelAction, leaveGroupAction, renameGroupAction } from "@/app/friends-actions";
import { cn } from "@/lib/cn";
import type { GroupMember, GroupSummary } from "@/lib/group-service";
import type { MessageKind } from "@/lib/message-service";
import type { Friend, PresenceKind } from "@/lib/types";
import { GroupAvatar, type Me } from "./friends-panel";
import { miniProfileProps } from "./mini-profile";
import {
  display,
  fileToDataUrl,
  groupByDayAndSender,
  imageToDataUrl,
  messageTimeLabel,
  presenceMeta,
  statusText,
  EMOJIS,
  type Conversation,
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
  onActivate: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseWindow: () => void;
  onSend: (convKey: string, body: string, input?: SendPayload) => void;
  onLoadOlder: (convKey: string) => Promise<boolean>;
  onSelectChannel: (groupId: string, channelId: string) => void;
  /** groupId 为空 = 从私聊发起建群（预选当前好友） */
  onInvite: (groupId: string | null, preselect: string[]) => void;
  onToggleMute: (groupId: string) => void;
  onOpenChat: (handle: string) => void;
  onGroupsChanged: () => Promise<unknown>;
}

export function ChatWindow(props: ChatWindowProps) {
  const { me, myPresence, friends, groups, openChats, activeChat, conversations, unread, markers, channelSel, mutedGroups } = props;

  const [drafts, setDrafts] = useState<Record<string, string>>({}); // 草稿按会话隔离，切 tab 不串
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  /** 名字着色：按发送者实时状态（Steam 同款） */
  const toneOf = (handle: string): string => {
    let kind: PresenceKind | undefined;
    if (handle === me.handle) kind = myPresence.kind === "offline" ? "online" : myPresence.kind;
    else kind = friendOf(handle)?.presence.kind ?? activeGroup?.members.find((m) => m.handle === handle)?.presence.kind;
    return presenceMeta[kind ?? "offline"].tone;
  };
  const nameOf = (sender: ViewMessage["sender"]): string => {
    if (sender.handle === me.handle) return me.name;
    const f = friendOf(sender.handle);
    return f ? display(f) : sender.name;
  };
  /** 悬停卡数据：好友 > 群成员 > 消息携带的兜底信息 */
  const profileOf = (sender: ViewMessage["sender"]): Friend =>
    friendOf(sender.handle) ?? activeGroup?.members.find((m) => m.handle === sender.handle) ?? fallbackFriend(sender);

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

  // 切换会话/频道 → 滚到底 + 输入框高度按该会话草稿重算
  useEffect(() => {
    atBottomRef.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
    autoGrow();
  }, [convKey]);

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

  useEffect(() => {
    if (!settingsOpen) return;
    const close = () => setSettingsOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [settingsOpen]);

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
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
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

  const send = () => {
    const body = draft.trim();
    if (!body || !convKey) return;
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
    atBottomRef.current = true;
    props.onSend(convKey, body);
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
  const grouped = groupByDayAndSender(messages, marker);
  const cornerCls = "absolute z-10 size-3.5";

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

  const messageArea = (
    <div ref={scrollRef} onScroll={onScroll} className="relative grow space-y-1 overflow-y-auto bg-page/40 px-3 py-3">
      {conv?.hasMore && <p className="py-1 text-center text-[10px] text-mute">上滑加载更早的消息…</p>}
      {messages.length === 0 ? (
        <p className="pt-8 text-center text-xs text-mute">{conv?.loaded ? "还没有聊天记录，打个招呼吧" : "加载中…"}</p>
      ) : (
        grouped.map((bucket) => (
          <div key={bucket.day} className="space-y-2">
            <div className="my-2 flex items-center gap-3 text-[11px] text-mute">
              <span className="h-px grow bg-line" />
              {bucket.day}
              <span className="h-px grow bg-line" />
            </div>
            {bucket.groups.map((g) => (
              <div key={g.items[0].id}>
                {g.markerBefore && (
                  <div className="my-2 border-t border-dashed border-accent/50" title="以下是新消息" />
                )}
                <div className="flex gap-2">
                  <span {...(g.sender.handle !== me.handle ? miniProfileProps(profileOf(g.sender)) : {})}>
                    <Avatar name={nameOf(g.sender)} hue={g.sender.avatarHue} src={g.sender.avatarUrl} size="sm" isAgent={g.sender.isAgent} className="mt-0.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-baseline gap-1.5 leading-none">
                      <span className={cn("text-xs font-semibold", toneOf(g.sender.handle))}>{nameOf(g.sender)}</span>
                      <span className="text-[10px] text-mute">{messageTimeLabel(g.start)}</span>
                    </p>
                    <div className="mt-1 space-y-1">
                      {g.items.map((m) => (
                        <MessageBody key={m.id} msg={m} onImage={setLightbox} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );

  const inputBar = (
    <div className="relative border-t border-line p-2">
      {emojiOpen && (
        <div className="absolute bottom-full left-2 z-10 mb-1 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-line bg-panel p-2 shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]">
          {EMOJIS.map((em) => (
            <button key={em} onClick={() => { setDraft(draft + em); setEmojiOpen(false); taRef.current?.focus(); }} className="rounded p-1 text-lg transition-colors hover:bg-card-hi">
              {em}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="absolute -top-7 left-2 rounded-md bg-ink/80 px-2 py-1 text-[11px] text-white">{hint}</p>}
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
      <div className="flex items-end gap-1.5">
        <div className="flex grow items-end gap-1.5 rounded-lg border border-line bg-page px-2 py-1 focus-within:border-accent">
          <textarea
            ref={taRef}
            value={draft}
            rows={1}
            onChange={(e) => {
              setDraft(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              // 中文等输入法选词时的 Enter 用于上屏候选，不能当作发送（否则会重复发送/发出拼音）
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
        <button onClick={() => flashHint("语音消息暂未开通（原型）")} className="rounded-lg border border-line p-2 text-dim transition-colors hover:bg-card-hi hover:text-ink" title="语音消息" aria-label="语音消息">
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
    </div>
  );

  return (
    <>
      <div
        className="fixed z-40 flex flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_50px_-12px_rgb(28_36_51/.32)]"
        style={winStyle}
      >
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
              </div>
            )}
            <div className="relative flex min-h-0 grow flex-col">
              {messageArea}
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
              onRename={async () => {
                const next = window.prompt("群组名称（留空恢复自动命名）", activeGroup.rawName);
                if (next === null) return;
                await renameGroupAction(activeGroup.id, next);
                await props.onGroupsChanged();
              }}
              onLeave={async () => {
                if (!window.confirm(`确定退出「${activeGroup.name}」？`)) return;
                await leaveGroupAction(activeGroup.id);
                props.onCloseTab(groupKey(activeGroup.id));
                await props.onGroupsChanged();
              }}
            />
            <div className="flex min-h-0 grow items-stretch">
              {showChannels && (
                <ChannelSidebar
                  group={activeGroup}
                  activeChannelId={activeChannelId}
                  unread={unread}
                  onSelect={(cid) => props.onSelectChannel(activeGroup.id, cid)}
                  onVoiceClick={() => flashHint("语音频道暂未开通（原型）")}
                  onCreated={props.onGroupsChanged}
                />
              )}
              <div className="flex min-w-0 grow flex-col border-l border-line">
                {messageArea}
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

/** 群消息发送者已不是好友时，悬停卡的兜底数据 */
function fallbackFriend(sender: ViewMessage["sender"]): Friend {
  return {
    handle: sender.handle,
    name: sender.name,
    remark: null,
    avatarHue: sender.avatarHue,
    avatarUrl: sender.avatarUrl ?? null,
    level: 0,
    presence: { kind: "offline" },
  };
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
  onRename,
  onLeave,
}: {
  group: GroupSummary;
  muted: boolean;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  onToggleMute: () => void;
  onInvite: () => void;
  onToggleMembers: () => void;
  onRename: () => void;
  onLeave: () => void;
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
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSettings();
            }}
            className="rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink"
            title="群组设置"
            aria-label="群组设置"
          >
            <Settings className="size-4" />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-[0_12px_40px_-12px_rgb(28_36_51/.35)]" onClick={(e) => e.stopPropagation()}>
              <button onClick={onRename} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-ink transition-colors hover:bg-card-hi">
                <Pencil className="size-3.5" /> 重命名群组
              </button>
              <button onClick={onLeave} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-danger transition-colors hover:bg-card-hi">
                <LogOut className="size-3.5" /> 退出群组
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ———————————————————— 频道栏 ————————————————————
function ChannelSidebar({
  group,
  activeChannelId,
  unread,
  onSelect,
  onVoiceClick,
  onCreated,
}: {
  group: GroupSummary;
  activeChannelId: string | null;
  unread: Record<string, number>;
  onSelect: (channelId: string) => void;
  onVoiceClick: () => void;
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
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "mx-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
              c.id === activeChannelId ? "bg-card-hi font-medium text-ink" : "text-dim hover:bg-card-hi/60",
              hasUnread && "font-semibold text-ink",
            )}
          >
            <Hash className="size-3.5 shrink-0 text-mute" />
            <span className="truncate">{c.name}</span>
            {hasUnread && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" />}
          </button>
        );
      })}
      <div className="px-1">{addRow("text", "添加文字频道")}</div>
      <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-wide text-mute">语音频道</p>
      {voices.map((c) => (
        <button key={c.id} onClick={onVoiceClick} className="mx-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] text-dim transition-colors hover:bg-card-hi/60" title="语音频道暂未开通（原型）">
          <Volume2 className="size-3.5 shrink-0 text-mute" />
          <span className="truncate">{c.name}</span>
        </button>
      ))}
      <div className="px-1">{addRow("voice", "添加语音频道")}</div>
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
      title={m.isMe ? "我" : m.isFriend ? "双击聊天 · 右键更多" : "单击查看主页"}
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

// ———————————————————— 消息气泡内容 ————————————————————
function MessageBody({ msg, onImage }: { msg: ViewMessage; onImage: (url: string) => void }) {
  if (msg.kind === "image" && msg.attachmentUrl) {
    const url = msg.attachmentUrl;
    return (
      <button onClick={() => onImage(url)} className="mt-1 block" title="点击放大">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="图片" className="max-h-48 max-w-full cursor-zoom-in rounded-lg border border-line object-cover" />
      </button>
    );
  }
  if (msg.kind === "file" && msg.attachmentUrl) {
    return (
      <a
        href={msg.attachmentUrl}
        download={msg.attachmentName ?? "file"}
        className="mt-1 flex max-w-[12rem] items-center gap-2 rounded-lg border border-line bg-card-hi px-2.5 py-2 text-xs transition-colors hover:border-accent/40"
      >
        <FileText className="size-5 shrink-0 text-accent" />
        <span className="min-w-0 grow truncate">{msg.attachmentName ?? "文件"}</span>
        <Download className="size-3.5 shrink-0 text-mute" />
      </a>
    );
  }
  // Agent 的回复按 markdown 渲染（代码块/列表/链接）；人类消息保持纯文本
  if (msg.sender.isAgent) {
    return <Markdown content={msg.body} className="max-w-full break-words" />;
  }
  return <p className="break-words text-sm leading-relaxed text-ink/90">{msg.body}</p>;
}
