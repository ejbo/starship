"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, CornerUpLeft, Download, FileText, Pause, Pencil, Play, SmilePlus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { GroupMember } from "@/lib/group-service";
import type { Friend } from "@/lib/types";
import { EmojiPicker } from "./emoji-picker";
import type { Me } from "./friends-panel";
import { miniProfileProps } from "./mini-profile";
import {
  display,
  formatDuration,
  groupByDayAndSender,
  linkify,
  messageTimeLabel,
  presenceMeta,
  QUICK_REACTIONS,
  voiceDuration,
  type ViewMessage,
} from "./presence";

interface MessageListProps {
  messages: ViewMessage[];
  me: Me;
  isGroup: boolean;
  marker: string | null;
  friends: Friend[];
  members: GroupMember[];
  dmFriend: Friend | null;
  /** DM：对方已读到的时刻（用于「已读」标记） */
  peerReadAt: string | null;
  onImage: (url: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (m: ViewMessage) => void;
  onEditCommit: (messageId: string, body: string) => void;
  onDelete: (messageId: string) => void;
  onJumpTo: (messageId: string) => void;
}

export function MessageList(props: MessageListProps) {
  const { messages, me, isGroup, marker, friends, members, dmFriend, peerReadAt } = props;
  const [editingId, setEditingId] = useState<string | null>(null);

  const friendOf = (handle: string): Friend | undefined =>
    friends.find((f) => f.handle === handle) ?? members.find((m) => m.handle === handle) ?? (dmFriend?.handle === handle ? dmFriend : undefined);
  const nameOf = (s: ViewMessage["sender"]) => (s.handle === me.handle ? me.name : friendOf(s.handle) ? display(friendOf(s.handle)!) : s.name);
  const toneOf = (handle: string) => {
    if (handle === me.handle) return presenceMeta.online.tone;
    return presenceMeta[friendOf(handle)?.presence.kind ?? "offline"].tone;
  };
  const profileOf = (s: ViewMessage["sender"]): Friend =>
    friendOf(s.handle) ?? { handle: s.handle, name: s.name, remark: null, avatarHue: s.avatarHue, avatarUrl: s.avatarUrl ?? null, level: 0, isAgent: s.isAgent, presence: { kind: "offline" } };

  // 最后一条「我发的、对方已读」的消息 id（DM 已读标记）
  const lastReadOwnId = (() => {
    if (isGroup || !peerReadAt) return null;
    let id: string | null = null;
    for (const m of messages) if (m.sender.handle === me.handle && m.at <= peerReadAt) id = m.id;
    return id;
  })();

  const grouped = groupByDayAndSender(messages, marker);

  return (
    <>
      {grouped.map((bucket) => (
        <div key={bucket.day} className="space-y-2">
          <div className="my-2 flex items-center gap-3 text-[11px] text-mute">
            <span className="h-px grow bg-line" />
            {bucket.day}
            <span className="h-px grow bg-line" />
          </div>
          {bucket.groups.map((g) => (
            <div key={g.items[0].id}>
              {g.markerBefore && <div className="my-2 border-t border-dashed border-accent/50" title="以下是新消息" />}
              <div className="flex gap-2">
                <span {...(g.sender.handle !== me.handle ? miniProfileProps(profileOf(g.sender)) : {})}>
                  <Avatar name={nameOf(g.sender)} hue={g.sender.avatarHue} src={g.sender.avatarUrl} size="sm" isAgent={g.sender.isAgent} className="mt-0.5" />
                </span>
                <div className="min-w-0 grow">
                  <p className="flex items-baseline gap-1.5 leading-none">
                    <span className={cn("text-xs font-semibold", toneOf(g.sender.handle))}>{nameOf(g.sender)}</span>
                    <span className="text-[10px] text-mute">{messageTimeLabel(g.start)}</span>
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {g.items.map((m) => (
                      <MessageItem
                        key={m.id}
                        msg={m}
                        mine={m.sender.handle === me.handle}
                        editing={editingId === m.id}
                        onStartEdit={() => setEditingId(m.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onCommitEdit={(body) => {
                          setEditingId(null);
                          props.onEditCommit(m.id, body);
                        }}
                        onReact={(emoji) => props.onReact(m.id, emoji)}
                        onReply={() => props.onReply(m)}
                        onDelete={() => props.onDelete(m.id)}
                        onImage={props.onImage}
                        onJumpTo={props.onJumpTo}
                        showRead={m.id === lastReadOwnId}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function MessageItem({
  msg,
  mine,
  editing,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onReact,
  onReply,
  onDelete,
  onImage,
  onJumpTo,
  showRead,
}: {
  msg: ViewMessage;
  mine: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommitEdit: (body: string) => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
  onImage: (url: string) => void;
  onJumpTo: (id: string) => void;
  showRead: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const tmp = msg.id.startsWith("tmp-");

  return (
    <div className="group/msg relative -mx-1 rounded-md px-1 py-0.5 hover:bg-card-hi/40" data-mid={msg.id}>
      {/* 引用条 */}
      {msg.replyTo && (
        <button
          onClick={() => onJumpTo(msg.replyTo!.id)}
          className="mb-0.5 flex max-w-full items-center gap-1 truncate rounded border-l-2 border-accent/50 bg-card-hi/60 px-1.5 py-0.5 text-left text-[11px] text-dim hover:bg-card-hi"
        >
          <CornerUpLeft className="size-3 shrink-0 text-mute" />
          <span className="font-medium text-dim">{msg.replyTo.senderName}</span>
          <span className="truncate text-mute">{msg.replyTo.excerpt}</span>
        </button>
      )}

      {/* 正文 */}
      {msg.deleted ? (
        <p className="text-sm italic text-mute">此消息已删除</p>
      ) : editing ? (
        <EditBox initial={msg.body} onCancel={onCancelEdit} onCommit={onCommitEdit} />
      ) : (
        <div className="text-sm leading-relaxed">
          <MessageBody msg={msg} onImage={onImage} />
          {msg.editedAt && <span className="ml-1 align-baseline text-[10px] text-mute">（已编辑）</span>}
        </div>
      )}

      {/* 反应条 */}
      {!msg.deleted && (msg.reactions?.length ?? 0) > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {msg.reactions!.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(r.emoji)}
              className={cn(
                "flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[11px] transition-colors",
                r.mine ? "border-accent/50 bg-accent/10 text-accent" : "border-line bg-card-hi text-dim hover:border-accent/30",
              )}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}

      {showRead && <p className="mt-0.5 text-right text-[10px] text-mute">已读</p>}

      {/* 悬停操作条 */}
      {!msg.deleted && !editing && !tmp && (
        <div className="absolute -top-3 right-1 z-10 hidden items-center gap-0.5 rounded-lg border border-line bg-panel px-0.5 py-0.5 shadow-sm group-hover/msg:flex">
          {QUICK_REACTIONS.slice(0, 4).map((em) => (
            <button key={em} onClick={() => onReact(em)} className="rounded p-0.5 text-sm transition-colors hover:bg-card-hi" title={`回应 ${em}`}>
              {em}
            </button>
          ))}
          <div className="relative">
            <button onClick={() => setPickerOpen((o) => !o)} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-accent" title="更多表情" aria-label="更多表情">
              <SmilePlus className="size-3.5" />
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-full z-20 mt-1">
                <EmojiPicker
                  onPick={(em) => {
                    onReact(em);
                    setPickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>
          <button onClick={onReply} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-accent" title="回复" aria-label="回复">
            <CornerUpLeft className="size-3.5" />
          </button>
          {msg.kind === "text" && (
            <button
              onClick={async () => {
                if (await copyText(msg.body)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1000);
                }
              }}
              className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-accent"
              title="复制"
              aria-label="复制"
            >
              {copied ? <Check className="size-3.5 text-free" /> : <Copy className="size-3.5" />}
            </button>
          )}
          {mine && msg.kind === "text" && (
            <button onClick={onStartEdit} className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-accent" title="编辑" aria-label="编辑">
              <Pencil className="size-3.5" />
            </button>
          )}
          {mine && (
            <button
              onClick={() => {
                if (window.confirm("删除这条消息？")) onDelete();
              }}
              className="rounded p-1 text-dim transition-colors hover:bg-card-hi hover:text-danger"
              title="删除"
              aria-label="删除"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EditBox({ initial, onCancel, onCommit }: { initial: string; onCancel: () => void; onCommit: (body: string) => void }) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(val.length, val.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <textarea
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (val.trim()) onCommit(val.trim());
          }
        }}
        rows={1}
        className="w-full resize-none rounded-md border border-accent bg-page px-2 py-1 text-sm focus:outline-none"
      />
      <p className="mt-0.5 text-[10px] text-mute">Enter 保存 · Esc 取消</p>
    </div>
  );
}

// —— 消息正文（文本 linkify / 图片 / 文件 / 语音 / agent markdown） ——
function MessageBody({ msg, onImage }: { msg: ViewMessage; onImage: (url: string) => void }) {
  if (msg.kind === "app-invite") {
    let d: { appName?: string; appIcon?: string; gameName?: string; hostName?: string; deepLink?: string } = {};
    try {
      d = JSON.parse(msg.body);
    } catch {
      /* ignore */
    }
    return (
      <div className="mt-0.5 w-[15rem] overflow-hidden rounded-xl border border-line bg-card-hi">
        <div className="flex items-center gap-2 px-3 pt-3">
          {d.appIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.appIcon} alt="" className="size-8 rounded-lg object-cover" />
          ) : (
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-sm font-bold text-white">华</span>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{(d.appName ?? "华子") + " · " + (d.gameName ?? "游戏")}</div>
            <div className="truncate text-xs text-mute">{(d.hostName ?? "好友") + " 邀你一起玩"}</div>
          </div>
        </div>
        <a
          href={d.deepLink ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block bg-accent px-3 py-2 text-center text-sm font-semibold text-white transition hover:brightness-110"
        >
          加入游戏 →
        </a>
      </div>
    );
  }
  if (msg.kind === "voice" && msg.attachmentUrl) return <VoiceBubble url={msg.attachmentUrl} seconds={voiceDuration(msg.attachmentName)} transcript={msg.body} />;
  if (msg.kind === "image" && msg.attachmentUrl) {
    const url = msg.attachmentUrl;
    return (
      <button onClick={() => onImage(url)} className="mt-0.5 block" title="点击放大">
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
        className="mt-0.5 flex max-w-[12rem] items-center gap-2 rounded-lg border border-line bg-card-hi px-2.5 py-2 text-xs transition-colors hover:border-accent/40"
      >
        <FileText className="size-5 shrink-0 text-accent" />
        <span className="min-w-0 grow truncate">{msg.attachmentName ?? "文件"}</span>
        <Download className="size-3.5 shrink-0 text-mute" />
      </a>
    );
  }
  if (msg.sender.isAgent) return <Markdown content={msg.body} className="max-w-full break-words" />;
  // 人类文本：linkify（安全 React 节点，不 innerHTML）
  return (
    <p className="break-words text-sm leading-relaxed text-ink/90">
      {linkify(msg.body).map((seg, i) =>
        seg.type === "link" ? (
          <a key={i} href={seg.value} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline">
            {seg.value}
          </a>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}

// —— 语音消息播放器（<audio>，含进度 + 时长 + 可选转写文字） ——
function VoiceBubble({ url, seconds, transcript }: { url: string; seconds: number; transcript: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [showText, setShowText] = useState(false);
  const dur = seconds || 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play();
  };

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div className="mt-0.5 inline-block max-w-[16rem] align-top">
      <div className="flex items-center gap-2 rounded-full border border-line bg-card-hi px-2.5 py-1.5">
        <button onClick={toggle} className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-deep" aria-label={playing ? "暂停" : "播放"}>
          {playing ? <Pause className="size-3" /> : <Play className="size-3" />}
        </button>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-dim">{formatDuration(playing || cur > 0 ? cur : dur)}</span>
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCur(0);
          }}
          onTimeUpdate={(e) => setCur((e.target as HTMLAudioElement).currentTime)}
          className="hidden"
        />
      </div>
      {transcript && (
        <button onClick={() => setShowText((s) => !s)} className="mt-0.5 block text-left text-[11px] text-accent hover:underline">
          {showText ? "收起文字" : "转文字 ▾"}
        </button>
      )}
      {transcript && showText && <p className="mt-0.5 max-w-[16rem] break-words text-sm leading-relaxed text-ink/90">{transcript}</p>}
    </div>
  );
}

// Check 图标本地引入（避免顶部再加）
function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={className} aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
