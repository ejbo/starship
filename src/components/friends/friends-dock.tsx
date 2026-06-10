"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, MessageSquareText, Search, Send, UserPlus, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  acceptRequestAction,
  addFriendAction,
  loadConversationAction,
  sendMessageAction,
} from "@/app/friends-actions";
import type { ChatMessage } from "@/lib/message-service";
import type { FriendRequestView } from "@/lib/friends-service";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

const presenceMeta: Record<PresenceKind, { dot: string; text: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", text: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", text: (d) => `正在使用 ${d}`, tone: "text-green" },
  meeting: { dot: "bg-purple", text: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", text: () => "离线", tone: "text-mute" },
};

type View = "list" | "add";

// —— 时间/分组工具 ——
function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays === 0) return "今天";
  if (diffDays === 1) return "昨天";
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

interface MsgGroup {
  from: "me" | "friend";
  day: string;
  start: string;
  items: string[];
}

/** 把连续同发送者的消息合并成组，并标注按天分隔 */
function groupMessages(messages: ChatMessage[]): { day: string; groups: MsgGroup[] }[] {
  const days: { day: string; groups: MsgGroup[] }[] = [];
  for (const m of messages) {
    const day = dayLabel(m.at);
    let dayBucket = days[days.length - 1];
    if (!dayBucket || dayBucket.day !== day) {
      dayBucket = { day, groups: [] };
      days.push(dayBucket);
    }
    const last = dayBucket.groups[dayBucket.groups.length - 1];
    if (last && last.from === m.from) {
      last.items.push(m.body);
    } else {
      dayBucket.groups.push({ from: m.from, day, start: m.at, items: [m.body] });
    }
  }
  return days;
}

function FriendRow({ friend, onOpen }: { friend: Friend; onOpen: () => void }) {
  const meta = presenceMeta[friend.presence.kind];
  const offline = friend.presence.kind === "offline";
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
    >
      <span className="relative">
        <Avatar name={friend.name} hue={friend.avatarHue} size="sm" className={cn(offline && "opacity-45")} />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn("block truncate text-sm", offline ? "text-mute" : "text-ink")}>
          {friend.name}
          <span className="ml-1.5 text-[10px] text-mute">Lv.{friend.level}</span>
        </span>
        <span className={cn("block truncate text-[11px]", meta.tone)}>{meta.text(friend.presence.detail)}</span>
      </span>
    </button>
  );
}

function StatusGroup({ label, color, friends, onOpen }: { label: string; color: string; friends: Friend[]; onOpen: (f: Friend) => void }) {
  if (friends.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] font-semibold text-mute">
        <span className={cn("size-1.5 rounded-full", color)} /> {label} ({friends.length})
      </p>
      {friends.map((f) => (
        <FriendRow key={f.handle} friend={f} onOpen={() => onOpen(f)} />
      ))}
    </div>
  );
}

function ChatView({ me, friend, onBack }: { me: { name: string; avatarHue: number }; friend: Friend; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    loadConversationAction(friend.handle).then((msgs) => {
      if (active) {
        setMessages(msgs);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [friend.handle]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    setMessages((m) => [...m, { from: "me", body, at: new Date().toISOString() }]);
    await sendMessageAction(friend.handle, body);
  };

  const meta = presenceMeta[friend.presence.kind];
  const grouped = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button onClick={onBack} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回">
          <ChevronLeft className="size-4" />
        </button>
        <span className="relative">
          <Avatar name={friend.name} hue={friend.avatarHue} size="sm" />
          <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-medium">{friend.name}</p>
          <p className={cn("text-[11px]", meta.tone)}>{meta.text(friend.presence.detail)}</p>
        </div>
      </div>

      <div ref={scrollRef} className="grow space-y-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="pt-8 text-center text-xs text-mute">加载中…</p>
        ) : messages.length === 0 ? (
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
                      name={mine ? me.name : friend.name}
                      hue={mine ? me.avatarHue : friend.avatarHue}
                      size="sm"
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <p className="flex items-baseline gap-1.5 leading-none">
                        <span className="text-xs font-semibold">{mine ? me.name : friend.name}</span>
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
          placeholder={`发消息给 ${friend.name}`}
          className="grow rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-md bg-accent p-2 text-white transition-colors hover:bg-accent-deep disabled:opacity-40"
          aria-label="发送"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddFriendView({ requests, onBack }: { requests: FriendRequestView[]; onBack: () => void }) {
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingReqs, setPendingReqs] = useState(requests);

  const submit = async () => {
    const h = handle.trim();
    if (!h) return;
    const res = await addFriendAction(h);
    setMsg(res.ok ? `已向 ${h} 发送好友请求` : res.error ?? "添加失败");
    if (res.ok) setHandle("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button onClick={onBack} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium">添加好友</p>
      </div>
      <div className="grow space-y-4 overflow-y-auto p-3">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="输入对方用户名"
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
                      await acceptRequestAction(req.edgeId);
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

export function FriendsDock({
  me,
  friends,
  requests,
}: {
  me: { name: string; avatarHue: number };
  friends: Friend[];
  requests: FriendRequestView[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [chatWith, setChatWith] = useState<Friend | null>(null);
  const [query, setQuery] = useState("");

  const onlineCount = friends.filter((f) => f.presence.kind !== "offline").length;

  const filtered = friends.filter((f) => f.name.includes(query) || f.handle.includes(query));
  const inGame = filtered.filter((f) => f.presence.kind === "using" || f.presence.kind === "meeting");
  const online = filtered.filter((f) => f.presence.kind === "online");
  const offline = filtered.filter((f) => f.presence.kind === "offline");

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex h-[28rem] w-[21rem] flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
          >
            {chatWith ? (
              <ChatView me={me} friend={chatWith} onBack={() => setChatWith(null)} />
            ) : view === "add" ? (
              <AddFriendView requests={requests} onBack={() => setView("list")} />
            ) : (
              <>
                {/* 你自己的状态头 */}
                <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
                  <span className="relative">
                    <Avatar name={me.name} hue={me.avatarHue} size="sm" />
                    <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-accent ring-2 ring-panel" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold">{me.name}</p>
                    <button className="flex items-center gap-0.5 text-[11px] text-accent">
                      在线 <ChevronDown className="size-3" />
                    </button>
                  </div>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      onClick={() => setView("add")}
                      className="relative rounded p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink"
                      aria-label="添加好友"
                      title="添加好友"
                    >
                      <UserPlus className="size-4" />
                      {requests.length > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white">
                          {requests.length}
                        </span>
                      )}
                    </button>
                    <button onClick={() => setOpen(false)} className="rounded p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                {/* 搜索 */}
                <div className="border-b border-line px-3 py-2">
                  <label className="flex items-center gap-2 rounded-md border border-line bg-page px-2.5 py-1.5 text-sm text-mute focus-within:border-accent">
                    <Search className="size-3.5" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
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
                      <StatusGroup label="游戏中" color="bg-green" friends={inGame} onOpen={setChatWith} />
                      <StatusGroup label="在线" color="bg-accent" friends={online} onOpen={setChatWith} />
                      <StatusGroup label="离线" color="bg-mute" friends={offline} onOpen={setChatWith} />
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          if (open) {
            setChatWith(null);
            setView("list");
          }
          setOpen((o) => !o);
        }}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-[0_4px_16px_-6px_rgb(28_36_51/.2)] transition-colors",
          open ? "border-accent bg-accent text-white" : "border-line bg-panel text-ink hover:border-accent/50",
        )}
      >
        {open ? <MessageSquareText className="size-4" /> : <Users className="size-4 text-accent" />}
        好友与聊天
        <span className={cn("rounded px-1.5 py-0.5 text-xs", open ? "bg-white/20" : "bg-green/12 text-green")}>
          {onlineCount}
        </span>
      </button>
    </div>
  );
}
