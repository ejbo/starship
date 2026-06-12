"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  FileText,
  ImageIcon,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Smile,
  Store,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  acceptRequestAction,
  addFriendAction,
  loadConversationAction,
  pollUpdatesAction,
  refreshSocialAction,
  removeFriendAction,
  sendMessageAction,
  setRemarkAction,
} from "@/app/friends-actions";
import type { ChatMessage, MessageKind } from "@/lib/message-service";
import type { FriendRequestView } from "@/lib/friends-service";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

export interface Me {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  friendCode: string | null;
  presence: { kind: PresenceKind; detail?: string; appSlug?: string };
}

interface Conversation {
  messages: ChatMessage[];
  hasMore: boolean;
}

const presenceMeta: Record<PresenceKind, { dot: string; text: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", text: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", text: (d) => `正在使用 ${d}`, tone: "text-green" },
  meeting: { dot: "bg-purple", text: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", text: () => "离线", tone: "text-mute" },
};

const display = (f: Friend) => f.remark || f.name;

const EMOJIS = "😀😄😁😆😉😊🙂😍😘😎🤔😐😴😭😡👍👎👌🙏👏💪🎉🔥✨💯❤️💔⭐🌟✅❌❓💡📌🚀☕🍻🐶🐱".match(/./gu) ?? [];

// —— 时间/分组 ——
const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const s = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((s(now) - s(d)) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}
function groupByDayAndSender(messages: ChatMessage[]) {
  const days: { day: string; groups: { from: "me" | "friend"; start: string; items: ChatMessage[] }[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.at);
    let bucket = days[days.length - 1];
    if (!bucket || bucket.day !== day) {
      bucket = { day, groups: [] };
      days.push(bucket);
    }
    const last = bucket.groups[bucket.groups.length - 1];
    if (last && last.from === m.from) last.items.push(m);
    else bucket.groups.push({ from: m.from, start: m.at, items: [m] });
  }
  return days;
}

/** 把图片压缩成较小的 JPEG dataURL */
function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("无法处理图片"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

interface ContextMenuState {
  friend: Friend;
  x: number;
  y: number;
}
interface Toast {
  id: number;
  fromName: string;
  body: string;
  handle: string;
}

const DOCK_KEY = "starport_dock_state";

export function SocialLayer({
  me,
  initialFriends,
  initialRequests,
}: {
  me: Me;
  initialFriends: Friend[];
  initialRequests: FriendRequestView[];
}) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [requests, setRequests] = useState<FriendRequestView[]>(initialRequests);
  const [myPresence, setMyPresence] = useState(me.presence);
  const [dockOpen, setDockOpen] = useState(false);
  const [view, setView] = useState<"list" | "add">("list");
  const [query, setQuery] = useState("");

  const [openChats, setOpenChats] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [restored, setRestored] = useState(false);

  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChat;

  // —— 恢复坞/会话开关状态（跨刷新保留） ——
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCK_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.dockOpen) setDockOpen(true);
        if (Array.isArray(s.openChats)) setOpenChats(s.openChats);
        if (s.activeChat) setActiveChat(s.activeChat);
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);

  // —— 持久化坞/会话开关状态 ——
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(DOCK_KEY, JSON.stringify({ dockOpen, openChats, activeChat }));
    } catch {
      /* ignore */
    }
  }, [restored, dockOpen, openChats, activeChat]);

  const refresh = useCallback(async () => {
    const res = await refreshSocialAction();
    setFriends(res.friends);
    setRequests(res.requests);
  }, []);

  const loadedRef = useRef<Set<string>>(new Set());
  const ensureLoaded = useCallback(async (handle: string) => {
    if (loadedRef.current.has(handle)) return;
    loadedRef.current.add(handle);
    setConversations((c) => (c[handle] ? c : { ...c, [handle]: { messages: [], hasMore: false } }));
    const page = await loadConversationAction(handle);
    setConversations((c) => ({ ...c, [handle]: { messages: page.messages, hasMore: page.hasMore } }));
  }, []);

  const openChat = useCallback(
    async (handle: string) => {
      setOpenChats((cur) => (cur.includes(handle) ? cur : [...cur, handle]));
      setActiveChat(handle);
      setUnread((u) => ({ ...u, [handle]: 0 }));
      await ensureLoaded(handle);
    },
    [ensureLoaded],
  );

  // 恢复时若有打开的会话，预加载它们的消息
  useEffect(() => {
    if (!restored) return;
    openChats.forEach((h) => void ensureLoaded(h));
  }, [restored, openChats, ensureLoaded]);

  const loadOlder = useCallback(async (handle: string) => {
    const conv = conversationsRef.current[handle];
    if (!conv || !conv.hasMore || conv.messages.length === 0) return false;
    const oldest = conv.messages[0].at;
    const page = await loadConversationAction(handle, oldest);
    setConversations((c) => {
      const prev = c[handle];
      if (!prev) return c;
      return { ...c, [handle]: { messages: [...page.messages, ...prev.messages], hasMore: page.hasMore } };
    });
    return true;
  }, []);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const closeChat = useCallback((handle: string) => {
    setOpenChats((cur) => {
      const next = cur.filter((h) => h !== handle);
      setActiveChat((a) => (a === handle ? next[next.length - 1] ?? null : a));
      return next;
    });
  }, []);

  const closeWindow = useCallback(() => {
    setOpenChats([]);
    setActiveChat(null);
  }, []);

  // —— 轮询：新消息 + 好友/请求/在线状态（每 2s） ——
  const sinceRef = useRef<string>(new Date().toISOString());
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await pollUpdatesAction(sinceRef.current);
        if (!alive) return;
        sinceRef.current = res.now;
        setFriends(res.friends);
        setRequests(res.requests);
        setMyPresence(res.myPresence);
        for (const m of res.messages) {
          const conv = m.from;
          const msg: ChatMessage = {
            id: m.id,
            from: "friend",
            kind: m.kind,
            body: m.body,
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            at: m.at,
          };
          setConversations((c) => (c[conv] ? { ...c, [conv]: { ...c[conv], messages: [...c[conv].messages, msg] } } : c));
          if (activeChatRef.current !== conv) {
            setUnread((u) => ({ ...u, [conv]: (u[conv] ?? 0) + 1 }));
            const preview = m.kind === "image" ? "[图片]" : m.kind === "file" ? `[文件] ${m.attachmentName ?? ""}` : m.body;
            const id = Date.now() + Math.floor(performance.now());
            setToasts((t) => [...t, { id, fromName: m.fromName, body: preview, handle: conv }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
          }
        }
      } catch {
        /* 网络抖动 */
      } finally {
        if (alive) timer = setTimeout(tick, 2000);
      }
    };
    timer = setTimeout(tick, 2000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // 外部页面（如库详情页的「哪些好友在玩」）通过自定义事件触发：双击开聊天 / 右键菜单
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ handle?: string }>).detail;
      if (d?.handle) void openChat(d.handle);
    };
    const onMenu = (e: Event) => {
      const d = (e as CustomEvent<{ friend?: Friend; x?: number; y?: number }>).detail;
      if (d?.friend) setMenu({ friend: d.friend, x: d.x ?? 0, y: d.y ?? 0 });
    };
    window.addEventListener("starport:open-chat", onOpen);
    window.addEventListener("starport:friend-menu", onMenu);
    return () => {
      window.removeEventListener("starport:open-chat", onOpen);
      window.removeEventListener("starport:friend-menu", onMenu);
    };
  }, [openChat]);

  // 关闭右键菜单
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menu]);

  const sendChat = useCallback(async (handle: string, body: string, input?: { kind: MessageKind; attachmentUrl?: string; attachmentName?: string }) => {
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      from: "me",
      kind: input?.kind ?? "text",
      body,
      attachmentUrl: input?.attachmentUrl ?? null,
      attachmentName: input?.attachmentName ?? null,
      at: new Date().toISOString(),
    };
    setConversations((c) => {
      const prev = c[handle] ?? { messages: [], hasMore: false };
      return { ...c, [handle]: { ...prev, messages: [...prev.messages, optimistic] } };
    });
    await sendMessageAction(handle, body, input ? { kind: input.kind, attachmentUrl: input.attachmentUrl, attachmentName: input.attachmentName } : undefined);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent, friend: Friend) => {
    e.preventDefault();
    setMenu({ friend, x: e.clientX, y: e.clientY });
  }, []);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const onlineCount = friends.filter((f) => f.presence.kind !== "offline").length;

  return (
    <>
      <ChatWindows
        me={me}
        friends={friends}
        openChats={openChats}
        activeChat={activeChat}
        conversations={conversations}
        unread={unread}
        onActivate={(h) => {
          setActiveChat(h);
          setUnread((u) => ({ ...u, [h]: 0 }));
        }}
        onCloseTab={closeChat}
        onCloseWindow={closeWindow}
        onSend={sendChat}
        onLoadOlder={loadOlder}
      />

      <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        {/* 消息提醒 toast */}
        <div className="flex flex-col items-end gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                onClick={() => {
                  openChat(t.handle);
                  setToasts((cur) => cur.filter((x) => x.id !== t.id));
                }}
                className="flex w-64 items-start gap-2.5 rounded-xl border border-line bg-panel p-3 text-left shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]"
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.fromName}</span>
                  <span className="block truncate text-xs text-dim">{t.body}</span>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {dockOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="flex h-[28rem] w-[21rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
            >
              {view === "add" ? (
                <AddFriendView
                  myCode={me.friendCode}
                  requests={requests}
                  onBack={() => setView("list")}
                  onAdd={addFriendAction}
                  onAccept={async (id) => {
                    await acceptRequestAction(id);
                    await refresh();
                  }}
                />
              ) : (
                <FriendsPanel
                  me={me}
                  myPresence={myPresence}
                  friends={friends}
                  requestCount={requests.length}
                  query={query}
                  onQuery={setQuery}
                  onClose={() => setDockOpen(false)}
                  onAdd={() => setView("add")}
                  onOpenChat={openChat}
                  onContextMenu={onContextMenu}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => {
            if (dockOpen) setView("list");
            setDockOpen((o) => !o);
          }}
          className={cn(
            "relative flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-[0_4px_16px_-6px_rgb(28_36_51/.2)] transition-colors",
            dockOpen ? "border-accent bg-accent text-white" : "border-line bg-panel text-ink hover:border-accent/50",
          )}
        >
          <Users className="size-4 text-accent" />
          好友与聊天
          <span className={cn("rounded px-1.5 py-0.5 text-xs", dockOpen ? "bg-white/20" : "bg-green/12 text-green")}>
            {onlineCount}
          </span>
          {totalUnread > 0 && !dockOpen && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
              {totalUnread}
            </span>
          )}
        </button>
      </div>

      {menu && (
        <FriendContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onMessage={() => openChat(menu.friend.handle)}
          onRemark={async () => {
            const cur = menu.friend.remark ?? "";
            const next = window.prompt(`给「${menu.friend.name}」设置备注（留空清除）`, cur);
            if (next !== null) {
              await setRemarkAction(menu.friend.handle, next);
              await refresh();
            }
          }}
          onRemove={async () => {
            if (window.confirm(`确定删除好友「${display(menu.friend)}」？`)) {
              await removeFriendAction(menu.friend.handle);
              closeChat(menu.friend.handle);
              await refresh();
            }
          }}
        />
      )}
    </>
  );
}

// ———————————————————— 好友列表面板 ————————————————————
function FriendRow({
  friend,
  onOpenChat,
  onContextMenu,
}: {
  friend: Friend;
  onOpenChat: (h: string) => void;
  onContextMenu: (e: React.MouseEvent, f: Friend) => void;
}) {
  const meta = presenceMeta[friend.presence.kind];
  const offline = friend.presence.kind === "offline";
  return (
    <button
      onDoubleClick={() => onOpenChat(friend.handle)}
      onContextMenu={(e) => onContextMenu(e, friend)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
      title="双击聊天 · 右键更多"
    >
      <span className="relative">
        <Avatar name={display(friend)} hue={friend.avatarHue} src={friend.avatarUrl} size="sm" className={cn(offline && "opacity-45")} />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn("block truncate text-sm", offline ? "text-mute" : "text-ink")}>
          {display(friend)}
          <span className="ml-1.5 text-[10px] text-mute">Lv.{friend.level}</span>
        </span>
        <span className={cn("block truncate text-[11px]", meta.tone)}>{meta.text(friend.presence.detail)}</span>
      </span>
    </button>
  );
}

function StatusGroup({
  label,
  color,
  friends,
  onOpenChat,
  onContextMenu,
}: {
  label: string;
  color: string;
  friends: Friend[];
  onOpenChat: (h: string) => void;
  onContextMenu: (e: React.MouseEvent, f: Friend) => void;
}) {
  if (friends.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] font-semibold text-mute">
        <span className={cn("size-1.5 rounded-full", color)} /> {label} ({friends.length})
      </p>
      {friends.map((f) => (
        <FriendRow key={f.handle} friend={f} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
      ))}
    </div>
  );
}

function FriendsPanel({
  me,
  myPresence,
  friends,
  requestCount,
  query,
  onQuery,
  onClose,
  onAdd,
  onOpenChat,
  onContextMenu,
}: {
  me: Me;
  myPresence: { kind: PresenceKind; detail?: string; appSlug?: string };
  friends: Friend[];
  requestCount: number;
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
  onAdd: () => void;
  onOpenChat: (h: string) => void;
  onContextMenu: (e: React.MouseEvent, f: Friend) => void;
}) {
  const filtered = friends.filter((f) => display(f).includes(query) || f.handle.includes(query));
  const inGame = filtered.filter((f) => f.presence.kind === "using" || f.presence.kind === "meeting");
  const online = filtered.filter((f) => f.presence.kind === "online");
  const offline = filtered.filter((f) => f.presence.kind === "offline");

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <span className="relative">
          <Avatar name={me.name} hue={me.avatarHue} src={me.avatarUrl} size="sm" />
          <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", presenceMeta[myPresence.kind].dot)} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{me.name}</p>
          {myPresence.kind === "using" && myPresence.appSlug ? (
            <a href={`/p/${myPresence.appSlug}`} className={cn("flex items-center gap-0.5 truncate text-[11px]", presenceMeta[myPresence.kind].tone)}>
              {presenceMeta[myPresence.kind].text(myPresence.detail)}
            </a>
          ) : (
            <span className={cn("flex items-center gap-0.5 text-[11px]", presenceMeta[myPresence.kind].tone)}>
              {presenceMeta[myPresence.kind].text(myPresence.detail)}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={onAdd} className="relative rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="添加好友" title="添加好友">
            <UserPlus className="size-4" />
            {requestCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                {requestCount}
              </span>
            )}
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-line px-3 py-2">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm text-mute focus-within:border-accent">
          <Search className="size-3.5" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="搜索好友"
            className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none"
          />
        </label>
      </div>

      <div className="grow overflow-y-auto px-1 py-1">
        {friends.length === 0 ? (
          <p className="px-2 pt-8 text-center text-xs text-mute">还没有好友，点右上角添加。</p>
        ) : (
          <>
            <StatusGroup label="游戏中" color="bg-green" friends={inGame} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
            <StatusGroup label="在线" color="bg-accent" friends={online} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
            <StatusGroup label="离线" color="bg-mute" friends={offline} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
          </>
        )}
      </div>
      <div className="border-t border-line px-3 py-1.5 text-center text-[10px] text-mute">双击好友打开聊天 · 右键更多操作</div>
    </>
  );
}

// ———————————————————— 添加好友 ————————————————————
function AddFriendView({
  myCode,
  requests,
  onBack,
  onAdd,
  onAccept,
}: {
  myCode: string | null;
  requests: FriendRequestView[];
  onBack: () => void;
  onAdd: (h: string) => Promise<{ ok: boolean; error?: string }>;
  onAccept: (edgeId: string) => Promise<void>;
}) {
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingReqs, setPendingReqs] = useState(requests);
  useEffect(() => setPendingReqs(requests), [requests]);

  const submit = async () => {
    const h = handle.trim();
    if (!h) return;
    const res = await onAdd(h);
    setMsg(res.ok ? `已向 ${h} 发送好友请求` : res.error ?? "添加失败");
    if (res.ok) setHandle("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button onClick={onBack} className="rounded-lg p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回">
          <X className="size-4" />
        </button>
        <p className="text-sm font-medium">添加好友</p>
      </div>
      <div className="grow space-y-4 overflow-y-auto p-3">
        {myCode && (
          <div className="rounded-lg border border-line bg-card-hi p-2.5">
            <p className="text-[11px] text-mute">你的好友码（分享给别人加你）</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="grow font-mono text-sm font-semibold text-accent">{myCode}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(myCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                }}
                className="text-mute transition-colors hover:text-accent"
                aria-label="复制好友码"
              >
                {copied ? <span className="text-[11px] text-free">已复制</span> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="对方的好友码或用户名"
              className="grow rounded-lg border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button onClick={submit} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep">
              添加
            </button>
          </div>
          {msg && <p className="text-xs text-dim">{msg}</p>}
        </div>
        {pendingReqs.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium text-mute">待处理请求 ({pendingReqs.length})</p>
            <ul className="space-y-2">
              {pendingReqs.map((req) => (
                <li key={req.edgeId} className="flex items-center gap-2.5">
                  <Avatar name={req.fromName} hue={req.fromHue} size="sm" />
                  <span className="min-w-0 grow truncate text-sm">{req.fromName}</span>
                  <button
                    onClick={async () => {
                      await onAccept(req.edgeId);
                      setPendingReqs((r) => r.filter((x) => x.edgeId !== req.edgeId));
                    }}
                    className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
                  >
                    <Check className="size-3" /> 接受
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ———————————————————— 右键菜单 ————————————————————
function FriendContextMenu({
  state,
  onClose,
  onMessage,
  onRemark,
  onRemove,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onMessage: () => void;
  onRemark: () => void;
  onRemove: () => void;
}) {
  const usingApp = state.friend.presence.kind === "using" ? state.friend.presence.appSlug : undefined;
  const items = [
    { label: "发消息", icon: MessageSquare, run: onMessage },
    { label: "查看个人主页", icon: Users, run: () => (window.location.href = `/u/${state.friend.handle}`) },
    ...(usingApp
      ? [{ label: "TA 正在玩的应用", icon: Store, run: () => (window.location.href = `/p/${usingApp}`) }]
      : []),
    { label: "设置备注", icon: Copy, run: onRemark },
    { label: "删除好友", icon: UserMinus, run: onRemove, danger: true },
  ];
  const left = Math.min(state.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180);
  const top = Math.min(state.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 180);
  return (
    <div
      className="fixed z-[60] w-44 overflow-hidden rounded-xl border border-line bg-panel py-1 shadow-[0_12px_40px_-12px_rgb(28_36_51/.35)]"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="truncate px-3 pb-1 pt-1 text-[11px] text-mute">{display(state.friend)}</p>
      {items.map((it) => (
        <button
          key={it.label}
          onClick={() => {
            it.run();
            onClose();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-card-hi",
            it.danger ? "text-danger" : "text-ink",
          )}
        >
          <it.icon className="size-3.5" /> {it.label}
        </button>
      ))}
    </div>
  );
}

// ———————————————————— 消息气泡内容 ————————————————————
function MessageBody({ msg, onImage }: { msg: ChatMessage; onImage: (url: string) => void }) {
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
  return <p className="text-sm leading-relaxed text-ink/90">{msg.body}</p>;
}

// ———————————————————— 多窗口 tab 聊天 ————————————————————
const MIN_W = 300;
const MIN_H = 360;
const DEFAULT_SIZE = { w: 340, h: 468 };
type Corner = "nw" | "ne" | "sw" | "se";

function ChatWindows({
  me,
  friends,
  openChats,
  activeChat,
  conversations,
  unread,
  onActivate,
  onCloseTab,
  onCloseWindow,
  onSend,
  onLoadOlder,
}: {
  me: Me;
  friends: Friend[];
  openChats: string[];
  activeChat: string | null;
  conversations: Record<string, Conversation>;
  unread: Record<string, number>;
  onActivate: (h: string) => void;
  onCloseTab: (h: string) => void;
  onCloseWindow: () => void;
  onSend: (h: string, body: string, input?: { kind: MessageKind; attachmentUrl?: string; attachmentName?: string }) => void;
  onLoadOlder: (h: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>(DEFAULT_SIZE);
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
  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 输入框随行数增高，到上限（128px）后内部滚动
  const autoGrow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  const friendOf = (h: string) => friends.find((f) => f.handle === h);
  const active = activeChat ? friendOf(activeChat) : null;
  const conv = activeChat ? conversations[activeChat] : undefined;
  const messages = conv?.messages ?? [];

  // 初始位置/尺寸：默认就开成大尺寸（约占视口），localStorage 记忆优先。
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

  // 切换会话 → 滚到底
  useEffect(() => {
    atBottomRef.current = true;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }, [activeChat]);

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

  // 计算最终位置/尺寸
  const dims = size;
  const winStyle = { left: pos.x, top: pos.y, width: size.w, height: size.h };

  // —— 拖动 ——
  const onDragStart = (e: React.PointerEvent) => {
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const x = Math.min(Math.max(8, e.clientX - dragRef.current.dx), window.innerWidth - dims.w - 8);
    const y = Math.min(Math.max(8, e.clientY - dragRef.current.dy), window.innerHeight - dims.h - 8);
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
    if (!pos) return;
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
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (el.scrollTop < 60 && conv?.hasMore && !loadingOlderRef.current && activeChat) {
      loadingOlderRef.current = true;
      prevHeightRef.current = el.scrollHeight;
      onLoadOlder(activeChat).then((ok) => {
        if (!ok) loadingOlderRef.current = false;
      });
    }
  };

  const send = () => {
    const body = draft.trim();
    if (!body || !activeChat) return;
    setDraft("");
    if (taRef.current) taRef.current.style.height = "auto";
    atBottomRef.current = true;
    onSend(activeChat, body);
  };

  const sendImage = async (file: File) => {
    if (!activeChat) return;
    try {
      const dataUrl = await imageToDataUrl(file);
      atBottomRef.current = true;
      onSend(activeChat, "", { kind: "image", attachmentUrl: dataUrl });
    } catch {
      /* ignore */
    }
  };
  const sendFile = async (file: File) => {
    if (!activeChat) return;
    if (file.size > 2_000_000) {
      alert("文件过大（上限 2MB）");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    atBottomRef.current = true;
    onSend(activeChat, file.name, { kind: "file", attachmentUrl: dataUrl, attachmentName: file.name });
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
          sendImage(file);
          return;
        }
      }
    }
  };

  const grouped = groupByDayAndSender(messages);
  const cornerCls = "absolute z-10 size-3.5";

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
            {openChats.map((h) => {
              const f = friendOf(h);
              if (!f) return null;
              const isActive = h === activeChat;
              const pm = presenceMeta[f.presence.kind];
              return (
                <div
                  key={h}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onActivate(h)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
                    isActive ? "bg-panel font-medium text-ink" : "max-w-[9rem] text-dim hover:bg-panel/60",
                  )}
                >
                  <span className="relative shrink-0">
                    <Avatar name={display(f)} hue={f.avatarHue} src={f.avatarUrl} size="sm" />
                    <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card-hi", pm.dot)} />
                    {(unread[h] ?? 0) > 0 && !isActive && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-danger ring-2 ring-card-hi" />}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13px]">{display(f)}</span>
                    {isActive && <span className={cn("block truncate text-[10px] font-normal", pm.tone)}>{pm.text(f.presence.detail)}</span>}
                  </span>
                  <span
                    role="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(h);
                    }}
                    className="ml-0.5 rounded p-0.5 text-mute opacity-0 transition-opacity hover:bg-card-hi hover:text-ink group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center px-1" onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={onCloseWindow} className="rounded p-1.5 text-mute transition-colors hover:bg-danger/10 hover:text-danger" title="关闭" aria-label="关闭">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {active && (
          <>
            <div ref={scrollRef} onScroll={onScroll} className="grow space-y-1 overflow-y-auto bg-page/40 px-3 py-3">
              {conv?.hasMore && <p className="py-1 text-center text-[10px] text-mute">上滑加载更早的消息…</p>}
              {messages.length === 0 ? (
                <p className="pt-8 text-center text-xs text-mute">还没有聊天记录，打个招呼吧</p>
              ) : (
                grouped.map((bucket) => (
                  <div key={bucket.day} className="space-y-2">
                    <div className="my-2 flex items-center gap-2 text-[10px] text-mute">
                      <span className="h-px grow bg-line" />
                      {bucket.day}
                      <span className="h-px grow bg-line" />
                    </div>
                    {bucket.groups.map((g, gi) => {
                      const mine = g.from === "me";
                      return (
                        <div key={gi} className="flex gap-2">
                          <Avatar name={mine ? me.name : display(active)} hue={mine ? me.avatarHue : active.avatarHue} src={mine ? me.avatarUrl : active.avatarUrl} size="sm" className="mt-0.5" />
                          <div className="min-w-0">
                            <p className="flex items-baseline gap-1.5 leading-none">
                              <span className="text-xs font-semibold">{mine ? me.name : display(active)}</span>
                              <span className="text-[10px] text-mute">{timeLabel(g.start)}</span>
                            </p>
                            <div className="mt-1 space-y-1">
                              {g.items.map((m) => (
                                <MessageBody key={m.id} msg={m} onImage={setLightbox} />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="relative border-t border-line p-2">
              {emojiOpen && (
                <div className="absolute bottom-full left-2 mb-1 grid w-64 grid-cols-8 gap-0.5 rounded-xl border border-line bg-panel p-2 shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]">
                  {EMOJIS.map((em) => (
                    <button key={em} onClick={() => { setDraft((d) => d + em); setEmojiOpen(false); }} className="rounded p-1 text-lg transition-colors hover:bg-card-hi">
                      {em}
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-1.5 flex items-center gap-0.5">
                <button onClick={() => setEmojiOpen((o) => !o)} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-card-hi hover:text-ink" title="表情" aria-label="表情">
                  <Smile className="size-4" />
                </button>
                <button onClick={() => imgInputRef.current?.click()} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-card-hi hover:text-ink" title="图片" aria-label="图片">
                  <ImageIcon className="size-4" />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-card-hi hover:text-ink" title="文件" aria-label="文件">
                  <Paperclip className="size-4" />
                </button>
                <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ""; }} />
                <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) sendFile(f); e.target.value = ""; }} />
              </div>
              <div className="flex items-end gap-2">
                <textarea
                  ref={taRef}
                  value={draft}
                  rows={1}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    autoGrow();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  onPaste={onPaste}
                  placeholder={`发消息给 ${display(active)}`}
                  className="max-h-32 grow resize-none overflow-y-auto rounded-lg border border-line bg-page px-3 py-1.5 text-sm leading-relaxed focus:border-accent focus:outline-none"
                />
                <button onClick={send} disabled={!draft.trim()} className="rounded-lg bg-accent p-2 text-white transition-colors hover:bg-accent-deep disabled:opacity-40" aria-label="发送">
                  <Send className="size-3.5" />
                </button>
              </div>
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
