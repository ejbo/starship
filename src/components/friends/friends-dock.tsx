"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, MessageSquareText, Send, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cannedReplies, initialChats, type ChatMessage } from "@/lib/mock/chats";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

const presenceMeta: Record<PresenceKind, { dot: string; text: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", text: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", text: (d) => `正在使用 ${d}`, tone: "text-green" },
  meeting: { dot: "bg-purple", text: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", text: () => "离线", tone: "text-mute" },
};

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
        <span className={cn("block truncate text-sm", offline ? "text-mute" : "text-ink")}>{friend.name}</span>
        <span className={cn("block truncate text-[11px]", meta.tone)}>{meta.text(friend.presence.detail)}</span>
      </span>
    </button>
  );
}

function ChatView({ friend, onBack }: { friend: Friend; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChats[friend.handle] ?? []);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyCount = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => [...m, { from: "me", body, time: "刚刚" }]);
    setDraft("");
    if (friend.presence.kind !== "offline") {
      const reply = cannedReplies[replyCount.current % cannedReplies.length];
      replyCount.current += 1;
      setTimeout(() => {
        setMessages((m) => [...m, { from: "friend", body: reply, time: "刚刚" }]);
      }, 900);
    }
  };

  const meta = presenceMeta[friend.presence.kind];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button onClick={onBack} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回好友列表">
          <ChevronLeft className="size-4" />
        </button>
        <Avatar name={friend.name} hue={friend.avatarHue} size="sm" />
        <div className="leading-tight">
          <p className="text-sm font-medium">{friend.name}</p>
          <p className={cn("text-[11px]", meta.tone)}>{meta.text(friend.presence.detail)}</p>
        </div>
      </div>

      <div ref={scrollRef} className="grow space-y-2.5 overflow-y-auto px-3 py-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.from === "me" ? "justify-end" : "justify-start")}>
            <div className="max-w-[78%]">
              <p
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm leading-relaxed",
                  msg.from === "me" ? "bg-accent text-white" : "bg-card-hi text-ink",
                )}
              >
                {msg.body}
              </p>
              <p className={cn("mt-0.5 text-[10px] text-mute", msg.from === "me" && "text-right")}>{msg.time}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="pt-8 text-center text-xs text-mute">还没有聊天记录，打个招呼吧</p>}
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

/** 全局好友面板：Steam「好友与聊天」式右下角常驻入口 */
export function FriendsDock({ friends }: { friends: Friend[] }) {
  const [open, setOpen] = useState(false);
  const [chatWith, setChatWith] = useState<Friend | null>(null);
  const onlineCount = friends.filter((f) => f.presence.kind !== "offline").length;
  const online = friends.filter((f) => f.presence.kind !== "offline");
  const offline = friends.filter((f) => f.presence.kind === "offline");

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="flex h-[26rem] w-80 flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
          >
            {chatWith ? (
              <ChatView friend={chatWith} onBack={() => setChatWith(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
                  <p className="text-sm font-semibold">
                    好友 <span className="ml-1 text-xs font-normal text-mute">{onlineCount}/{friends.length} 在线</span>
                  </p>
                  <button onClick={() => setOpen(false)} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grow overflow-y-auto p-2">
                  <p className="px-2 pt-1 pb-1.5 text-[11px] font-medium text-mute">在线 ({online.length})</p>
                  {online.map((f) => (
                    <FriendRow key={f.handle} friend={f} onOpen={() => setChatWith(f)} />
                  ))}
                  <p className="px-2 pt-3 pb-1.5 text-[11px] font-medium text-mute">离线 ({offline.length})</p>
                  {offline.map((f) => (
                    <FriendRow key={f.handle} friend={f} onOpen={() => setChatWith(f)} />
                  ))}
                </div>
                <div className="border-t border-line px-3.5 py-2 text-[11px] text-mute">
                  消息为本地演示 · Phase 2 接入真实聊天
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-[0_4px_16px_-6px_rgb(28_36_51/.2)] transition-colors",
          open
            ? "border-accent bg-accent text-white"
            : "border-line bg-panel text-ink hover:border-accent/50",
        )}
      >
        {open ? <MessageSquareText className="size-4" /> : <Users className="size-4 text-accent" />}
        好友与聊天
        <span className={cn("rounded px-1.5 py-0.5 text-xs", open ? "bg-white/20" : "bg-accent/10 text-accent")}>
          {onlineCount}
        </span>
      </button>
    </div>
  );
}
