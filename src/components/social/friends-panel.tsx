"use client";

import { useState } from "react";
import { Bot, Check, ChevronDown, Copy, Plus, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { FriendRequestView } from "@/lib/friends-service";
import type { GroupMember, GroupSummary } from "@/lib/group-service";
import type { Friend, PresenceKind } from "@/lib/types";
import { miniProfileProps } from "./mini-profile";
import { display, presenceMeta, statusText } from "./presence";

export interface Me {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  friendCode: string | null;
  level: number;
  badge: { label: string; icon: string } | null;
  bannerUrl: string | null;
  presence: { kind: PresenceKind; detail?: string; appSlug?: string };
}

/** 把 Me 折成 Friend 形状（悬停卡复用） */
export function meAsFriend(me: Me, presence: Me["presence"]): Friend {
  return {
    handle: me.handle,
    name: me.name,
    remark: null,
    avatarHue: me.avatarHue,
    avatarUrl: me.avatarUrl,
    level: me.level,
    lastSeenAt: null,
    bannerUrl: me.bannerUrl,
    badge: me.badge,
    presence,
  };
}

/** 群组头像：成员头像 2×2 拼贴（单人则直接用对方头像） */
export function GroupAvatar({ group, size = "sm" }: { group: GroupSummary; size?: "xs" | "sm" }) {
  const others = group.members.filter((m) => !m.isMe);
  const shown = (others.length > 0 ? others : group.members).slice(0, 4);
  const box = size === "xs" ? "size-5" : "size-7";
  if (shown.length === 1) {
    return <Avatar name={display(shown[0])} hue={shown[0].avatarHue} src={shown[0].avatarUrl} size={size} />;
  }
  return (
    <span className={cn("grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-full border border-line bg-card-hi", box)}>
      {shown.map((m) =>
        m.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={m.handle} src={m.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span key={m.handle} className="size-full" style={{ background: `hsl(${m.avatarHue} 45% 55%)` }} />
        ),
      )}
      {shown.length === 3 && <span className="size-full bg-card-hi" />}
    </span>
  );
}

/** 正在使用应用的小图标（行首，Steam 在游戏图标位） */
function AppIcon({ friend }: { friend: Friend }) {
  const icon = friend.presence.appIcon;
  if (!icon) return <span className="w-5 shrink-0" />;
  if (icon.capsuleUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={icon.capsuleUrl} alt="" className="size-5 shrink-0 rounded object-cover" />;
  }
  const Icon = getProductIcon(icon.icon);
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded text-white"
      style={{ background: `linear-gradient(135deg, hsl(${icon.hueA} 55% 55%), hsl(${icon.hueB} 55% 45%))` }}
    >
      <Icon className="size-3" />
    </span>
  );
}

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
  const using = friend.presence.kind === "using";
  const meeting = friend.presence.kind === "meeting";
  return (
    <button
      onDoubleClick={() => onOpenChat(friend.handle)}
      onContextMenu={(e) => onContextMenu(e, friend)}
      {...miniProfileProps(friend)}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
    >
      {(using || meeting) && !friend.isAgent && <AppIcon friend={friend} />}
      <span className="relative shrink-0">
        <Avatar name={display(friend)} hue={friend.avatarHue} src={friend.avatarUrl} size="sm" className={cn(offline && "opacity-45")} />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className={cn("flex items-center gap-1 truncate text-sm", offline ? "text-mute" : meta.tone)}>
          <span className="truncate">{friend.name}</span>
          {friend.isAgent && <Bot className="size-3 shrink-0 opacity-70" />}
          {friend.remark && <span className={cn("shrink-0 text-xs", offline ? "text-mute/70" : "text-dim")}>（{friend.remark}）</span>}
        </span>
        <span className={cn("block truncate text-[11px]", offline ? "text-mute" : meta.tone, using && "font-medium")}>
          {statusText(friend)}
        </span>
      </span>
    </button>
  );
}

function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  action,
}: {
  label: string;
  count?: number;
  collapsed: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 px-2 pt-2.5 pb-1">
      <button onClick={onToggle} className="flex grow items-center gap-1 text-left text-[11px] font-semibold tracking-wide text-mute transition-colors hover:text-dim">
        <ChevronDown className={cn("size-3 transition-transform", collapsed && "-rotate-90")} />
        {label}
        {count !== undefined && <span className="font-normal">({count})</span>}
      </button>
      {action}
    </div>
  );
}

export function FriendsPanel({
  me,
  myPresence,
  friends,
  groups,
  requestCount,
  query,
  onQuery,
  onClose,
  onAdd,
  onOpenChat,
  onOpenGroup,
  onCreateGroup,
  onCreateAgent,
  onContextMenu,
}: {
  me: Me;
  myPresence: Me["presence"];
  friends: Friend[];
  groups: GroupSummary[];
  requestCount: number;
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
  onAdd: () => void;
  onOpenChat: (h: string) => void;
  onOpenGroup: (id: string) => void;
  onCreateGroup: () => void;
  onCreateAgent: () => void;
  onContextMenu: (e: React.MouseEvent, f: Friend) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"friends" | "agents">("friends");
  const toggle = (key: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const matched = friends.filter((f) => display(f).includes(query) || f.name.includes(query) || f.handle.includes(query));
  const humans = matched.filter((f) => !f.isAgent);
  const agents = matched.filter((f) => f.isAgent);
  const agentTotal = friends.filter((f) => f.isAgent).length;
  const inApp = humans.filter((f) => f.presence.kind === "using" || f.presence.kind === "meeting");
  const online = humans.filter((f) => f.presence.kind === "online");
  const offline = humans.filter((f) => f.presence.kind === "offline");
  const filteredGroups = groups.filter((g) => g.name.includes(query));
  const myMeta = presenceMeta[myPresence.kind];

  const renderSection = (key: string, label: string, list: Friend[]) =>
    list.length > 0 && (
      <div>
        <SectionHeader label={label} count={list.length} collapsed={collapsed.has(key)} onToggle={() => toggle(key)} />
        {!collapsed.has(key) && list.map((f) => <FriendRow key={f.handle} friend={f} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />)}
      </div>
    );

  return (
    <>
      {/* 顶部：自己（悬停同样出迷你资料卡） */}
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5" {...miniProfileProps(meAsFriend(me, myPresence))}>
          <span className="relative shrink-0">
            <Avatar name={me.name} hue={me.avatarHue} src={me.avatarUrl} size="sm" />
            <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", myMeta.dot)} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold">{me.name}</span>
            {myPresence.kind === "using" && myPresence.appSlug ? (
              <a href={`/p/${myPresence.appSlug}`} className={cn("block truncate text-[11px]", myMeta.tone)}>
                {myMeta.text(myPresence.detail)}
              </a>
            ) : (
              <span className={cn("block truncate text-[11px]", myMeta.tone)}>{myMeta.text(myPresence.detail)}</span>
            )}
          </span>
        </span>
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

      {/* 好友 / AI Agents 双 tab */}
      <div className="flex items-center gap-1 border-b border-line px-3 pt-2">
        {(
          [
            { key: "friends" as const, label: "好友", count: friends.length - agentTotal },
            { key: "agents" as const, label: "AI Agents", count: agentTotal },
          ]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-1.5 text-sm transition-colors",
              tab === t.key ? "border-accent font-medium text-ink" : "border-transparent text-dim hover:text-ink",
            )}
          >
            {t.key === "agents" && <Bot className="size-3.5" />}
            {t.label}
            <span className="text-[11px] text-mute">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="border-b border-line px-3 py-2">
        <label className="flex items-center gap-2 rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm text-mute focus-within:border-accent">
          <Search className="size-3.5" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={tab === "agents" ? "按名字搜索 Agent" : "按名字搜索好友或群组"}
            className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none"
          />
        </label>
      </div>

      {tab === "agents" ? (
        <div className="grow overflow-y-auto px-1 pb-1">
          <button
            onClick={onCreateAgent}
            className="mx-1 mt-2 flex w-[calc(100%-0.5rem)] items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-sm text-dim transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus className="size-4" /> 添加 Agent
          </button>
          {agents.length === 0 ? (
            agentTotal > 0 ? (
              <p className="px-3 pt-6 text-center text-xs text-mute">没有匹配的 Agent</p>
            ) : (
              <p className="px-3 pt-6 text-center text-xs leading-relaxed text-mute">
                还没有 AI Agent。
                <br />
                一键创建：托管的秒上线，本地的接 Claude Code / Codex，
                <br />
                可私聊指挥、可拉进群组和大家协作。
              </p>
            )
          ) : (
            <div className="mt-1.5">
              {agents.map((f) => (
                <FriendRow key={f.handle} friend={f} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grow overflow-y-auto px-1 pb-1">
          {humans.length === 0 && query === "" ? (
            <p className="px-2 pt-8 text-center text-xs text-mute">还没有好友，点右上角添加。</p>
          ) : (
            <>
              {renderSection("inapp", "正在使用", inApp)}
              {renderSection("online", "在线好友", online)}
              {renderSection("offline", "离线", offline)}
            </>
          )}

          {/* 群组聊天（Steam GROUP CHATS） */}
          <div className="mt-1 border-t border-line">
            <SectionHeader
              label="群组聊天"
              count={groups.length || undefined}
              collapsed={collapsed.has("groups")}
              onToggle={() => toggle("groups")}
              action={
                <button onClick={onCreateGroup} className="rounded-md p-1 text-dim transition-colors hover:bg-card-hi hover:text-accent" title="创建群组聊天" aria-label="创建群组聊天">
                  <Plus className="size-3.5" />
                </button>
              }
            />
            {!collapsed.has("groups") &&
              (filteredGroups.length === 0 ? (
                <p className="px-2 pb-2 pt-1 text-[11px] text-mute">{groups.length === 0 ? "还没有群组，点 + 和好友开一个。" : "没有匹配的群组"}</p>
              ) : (
                filteredGroups.map((g) => {
                  const onlineCount = g.members.filter((m) => !m.isMe && m.presence.kind !== "offline").length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => onOpenGroup(g.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
                    >
                      <GroupAvatar group={g} />
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm text-ink">{g.name}</span>
                        <span className="block truncate text-[11px] text-mute">
                          {onlineCount > 0 ? `${onlineCount} 人在线 · ` : ""}{g.members.length} 名成员
                        </span>
                      </span>
                    </button>
                  );
                })
              ))}
          </div>
        </div>
      )}
      <div className="border-t border-line px-3 py-1.5 text-center text-[10px] text-mute">双击打开聊天 · 右键更多操作</div>
    </>
  );
}

// ———————————————————— 添加好友 ————————————————————
export function AddFriendView({
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
                onClick={async () => {
                  if (await copyText(myCode)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }
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
        {requests.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium text-mute">待处理请求 ({requests.length})</p>
            <ul className="space-y-2">
              {requests.map((req) => (
                <li key={req.edgeId} className="flex items-center gap-2.5">
                  <Avatar name={req.fromName} hue={req.fromHue} size="sm" />
                  <span className="min-w-0 grow truncate text-sm">{req.fromName}</span>
                  <button
                    onClick={() => onAccept(req.edgeId)}
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

export type { GroupMember, GroupSummary };
