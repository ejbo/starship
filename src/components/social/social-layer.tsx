"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  MessageSquare,
  Search,
  Send,
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
import type { ChatMessage } from "@/lib/message-service";
import type { FriendRequestView } from "@/lib/friends-service";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

export interface Me {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  friendCode: string | null;
}

const presenceMeta: Record<PresenceKind, { dot: string; text: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", text: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", text: (d) => `正在使用 ${d}`, tone: "text-green" },
  meeting: { dot: "bg-purple", text: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", text: () => "离线", tone: "text-mute" },
};

const display = (f: Friend) => f.remark || f.name;

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
  const days: { day: string; groups: { from: "me" | "friend"; start: string; items: string[] }[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.at);
    let bucket = days[days.length - 1];
    if (!bucket || bucket.day !== day) {
      bucket = { day, groups: [] };
      days.push(bucket);
    }
    const last = bucket.groups[bucket.groups.length - 1];
    if (last && last.from === m.from) last.items.push(m.body);
    else bucket.groups.push({ from: m.from, start: m.at, items: [m.body] });
  }
  return days;
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
  const [dockOpen, setDockOpen] = useState(false);
  const [view, setView] = useState<"list" | "add">("list");
  const [query, setQuery] = useState("");

  const [openChats, setOpenChats] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);

  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChat;
  const friendsRef = useRef(friends);
  friendsRef.current = friends;

  const refresh = useCallback(async () => {
    const res = await refreshSocialAction();
    setFriends(res.friends);
    setRequests(res.requests);
  }, []);

  const openChat = useCallback(async (handle: string) => {
    setOpenChats((cur) => (cur.includes(handle) ? cur : [...cur, handle]));
    setActiveChat(handle);
    setUnread((u) => ({ ...u, [handle]: 0 }));
    setConversations((cur) => {
      if (cur[handle]) return cur;
      loadConversationAction(handle).then((msgs) => setConversations((c) => ({ ...c, [handle]: msgs })));
      return { ...cur, [handle]: [] };
    });
  }, []);

  const closeChat = useCallback((handle: string) => {
    setOpenChats((cur) => {
      const next = cur.filter((h) => h !== handle);
      setActiveChat((a) => (a === handle ? next[next.length - 1] ?? null : a));
      return next;
    });
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
        for (const m of res.messages) {
          const conv = m.from;
          const msg: ChatMessage = { from: "friend", body: m.body, at: m.at };
          setConversations((c) => (c[conv] ? { ...c, [conv]: [...c[conv], msg] } : c));
          if (activeChatRef.current !== conv) {
            setUnread((u) => ({ ...u, [conv]: (u[conv] ?? 0) + 1 }));
            const id = Date.now() + Math.floor(performance.now());
            setToasts((t) => [...t, { id, fromName: m.fromName, body: m.body, handle: conv }]);
            setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
          }
        }
      } catch {
        /* 网络抖动，下次再试 */
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

  const sendChat = useCallback(async (handle: string, body: string) => {
    const optimistic: ChatMessage = { from: "me", body, at: new Date().toISOString() };
    setConversations((c) => ({ ...c, [handle]: [...(c[handle] ?? []), optimistic] }));
    await sendMessageAction(handle, body);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent, friend: Friend) => {
    e.preventDefault();
    setMenu({ friend, x: e.clientX, y: e.clientY });
  }, []);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);
  const onlineCount = friends.filter((f) => f.presence.kind !== "offline").length;

  return (
    <>
      {/* 多窗口 tab 聊天 */}
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
        onClose={closeChat}
        onSend={sendChat}
      />

      {/* 好友坞 */}
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
                className="flex w-64 items-start gap-2.5 rounded-lg border border-line bg-panel p-3 text-left shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]"
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
              className="flex h-[28rem] w-[21rem] flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
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
            "relative flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-[0_4px_16px_-6px_rgb(28_36_51/.2)] transition-colors",
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

      {/* 右键菜单 */}
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
      onClick={() => onOpenChat(friend.handle)}
      onContextMenu={(e) => onContextMenu(e, friend)}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
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
          <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-accent ring-2 ring-panel" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{me.name}</p>
          <button className="flex items-center gap-0.5 text-[11px] text-accent">
            在线 <ChevronDown className="size-3" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={onAdd} className="relative rounded p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="添加好友" title="添加好友">
            <UserPlus className="size-4" />
            {requestCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                {requestCount}
              </span>
            )}
          </button>
          <button onClick={onClose} className="rounded p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-line px-3 py-2">
        <label className="flex items-center gap-2 rounded-md border border-line bg-page px-2.5 py-1.5 text-sm text-mute focus-within:border-accent">
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
        <button onClick={onBack} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回">
          <X className="size-4" />
        </button>
        <p className="text-sm font-medium">添加好友</p>
      </div>
      <div className="grow space-y-4 overflow-y-auto p-3">
        {myCode && (
          <div className="rounded-md border border-line bg-card-hi p-2.5">
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
              className="grow rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button onClick={submit} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep">
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
                    className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
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
  const items = [
    { label: "发消息", icon: MessageSquare, run: onMessage },
    { label: "查看个人主页", icon: Users, run: () => (window.location.href = `/u/${state.friend.handle}`) },
    { label: "设置备注", icon: Copy, run: onRemark },
    { label: "删除好友", icon: UserMinus, run: onRemove, danger: true },
  ];
  // 防止超出右边界
  const left = Math.min(state.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180);
  const top = Math.min(state.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 180);
  return (
    <div
      className="fixed z-[60] w-44 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-[0_12px_40px_-12px_rgb(28_36_51/.35)]"
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

// ———————————————————— 多窗口 tab 聊天 ————————————————————
function ChatWindows({
  me,
  friends,
  openChats,
  activeChat,
  conversations,
  unread,
  onActivate,
  onClose,
  onSend,
}: {
  me: Me;
  friends: Friend[];
  openChats: string[];
  activeChat: string | null;
  conversations: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  onActivate: (h: string) => void;
  onClose: (h: string) => void;
  onSend: (h: string, body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const friendOf = (h: string) => friends.find((f) => f.handle === h);
  const active = activeChat ? friendOf(activeChat) : null;
  const messages = activeChat ? conversations[activeChat] ?? [] : [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, activeChat]);

  if (openChats.length === 0) return null;

  const send = () => {
    const body = draft.trim();
    if (!body || !activeChat) return;
    setDraft("");
    onSend(activeChat, body);
  };

  const grouped = groupByDayAndSender(messages);

  return (
    <div className="fixed right-[19rem] bottom-4 z-40 flex h-[26rem] w-[20rem] flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]">
      {/* tab 栏 */}
      <div className="flex items-stretch gap-px overflow-x-auto border-b border-line bg-card-hi">
        {openChats.map((h) => {
          const f = friendOf(h);
          if (!f) return null;
          const isActive = h === activeChat;
          return (
            <div
              key={h}
              onClick={() => onActivate(h)}
              className={cn(
                "group flex max-w-[8rem] cursor-pointer items-center gap-1.5 px-2.5 py-2 text-xs transition-colors",
                isActive ? "bg-panel font-medium text-ink" : "text-dim hover:bg-panel/60",
              )}
            >
              <span className="relative">
                <Avatar name={display(f)} hue={f.avatarHue} src={f.avatarUrl} size="xs" />
                {(unread[h] ?? 0) > 0 && !isActive && (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />
                )}
              </span>
              <span className="truncate">{display(f)}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(h);
                }}
                className="rounded p-0.5 text-mute opacity-0 transition-opacity hover:bg-card-hi hover:text-ink group-hover:opacity-100"
              >
                <X className="size-3" />
              </span>
            </div>
          );
        })}
      </div>

      {active && (
        <>
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <span className="relative">
              <Avatar name={display(active)} hue={active.avatarHue} src={active.avatarUrl} size="sm" />
              <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", presenceMeta[active.presence.kind].dot)} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-medium">{display(active)}</p>
              <p className={cn("text-[11px]", presenceMeta[active.presence.kind].tone)}>
                {presenceMeta[active.presence.kind].text(active.presence.detail)}
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="grow space-y-1 overflow-y-auto px-3 py-3">
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
                        <Avatar
                          name={mine ? me.name : display(active)}
                          hue={mine ? me.avatarHue : active.avatarHue}
                          src={mine ? me.avatarUrl : active.avatarUrl}
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="flex items-baseline gap-1.5 leading-none">
                            <span className="text-xs font-semibold">{mine ? me.name : display(active)}</span>
                            <span className="text-[10px] text-mute">{timeLabel(g.start)}</span>
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {g.items.map((body, i) => (
                              <p key={i} className="text-sm leading-relaxed text-ink/90">{body}</p>
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

          <div className="flex items-center gap-2 border-t border-line p-2.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`发消息给 ${display(active)}`}
              className="grow rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <button onClick={send} disabled={!draft.trim()} className="rounded-md bg-accent p-2 text-white transition-colors hover:bg-accent-deep disabled:opacity-40" aria-label="发送">
              <Send className="size-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
