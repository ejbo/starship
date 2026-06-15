"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Clock, Copy, MessageSquare, Plus, Search, UserCheck, UserPlus, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { FriendRequestView, UserSearchResult } from "@/lib/friends-service";
import type { GroupMember, GroupSummary } from "@/lib/group-service";
import type { Friend, PresenceKind } from "@/lib/types";
import { miniProfileProps } from "./mini-profile";
import { display, presenceMeta, statusText, timeAgo } from "./presence";

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
      onClick={() => onOpenChat(friend.handle)}
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

type Tab = "all" | "friends" | "agents";

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
  const [tab, setTab] = useState<Tab>("all");
  const toggle = (key: string) =>
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const q = query.trim();
  const matches = (f: Friend) => display(f).includes(q) || f.name.includes(q) || f.handle.includes(q);
  const humansAll = friends.filter((f) => !f.isAgent);
  const agentsAll = friends.filter((f) => f.isAgent);

  // 当前 tab 的候选池（已套用搜索）
  const pool = (tab === "agents" ? agentsAll : tab === "friends" ? humansAll : friends).filter(matches);
  const inApp = pool.filter((f) => f.presence.kind === "using" || f.presence.kind === "meeting");
  const online = pool.filter((f) => f.presence.kind === "online");
  const offline = pool.filter((f) => f.presence.kind === "offline");
  const filteredGroups = q ? groups.filter((g) => g.name.includes(q)) : groups;
  const showGroups = tab !== "agents";
  const myMeta = presenceMeta[myPresence.kind];

  const tabs: { key: Tab; label: string; count: number; icon?: typeof Bot }[] = [
    { key: "all", label: "全部", count: friends.length },
    { key: "friends", label: "好友", count: humansAll.length },
    { key: "agents", label: "Agent", count: agentsAll.length, icon: Bot },
  ];

  const renderSection = (key: string, label: string, list: Friend[]) =>
    list.length > 0 && (
      <div key={key}>
        <SectionHeader label={label} count={list.length} collapsed={collapsed.has(key)} onToggle={() => toggle(key)} />
        {!collapsed.has(key) && list.map((f) => <FriendRow key={f.handle} friend={f} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />)}
      </div>
    );

  const emptyHint =
    tab === "agents"
      ? agentsAll.length === 0
        ? "还没有 AI Agent。点上方按钮创建：托管的秒上线，本地的接 Claude Code / Codex。"
        : "没有匹配的 Agent"
      : tab === "friends"
        ? humansAll.length === 0
          ? "还没有好友，点右上角 + 添加。"
          : "没有匹配的好友"
        : friends.length === 0
          ? "还没有好友或 Agent，点右上角 + 添加。"
          : "没有匹配的结果";

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
          <button onClick={onAdd} className="relative rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="添加好友" title="添加好友 / 好友申请">
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

      {/* 全部 / 好友 / Agent 三 tab */}
      <div className="flex items-center gap-1 border-b border-line px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-1.5 text-sm transition-colors",
              tab === t.key ? "border-accent font-medium text-ink" : "border-transparent text-dim hover:text-ink",
            )}
          >
            {t.icon && <t.icon className="size-3.5" />}
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
            placeholder={tab === "agents" ? "搜索 Agent" : tab === "friends" ? "搜索好友或群组" : "搜索好友或 Agent"}
            className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none"
          />
          {query && (
            <button onClick={() => onQuery("")} className="text-mute transition-colors hover:text-ink" aria-label="清除搜索">
              <X className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <div className="grow overflow-y-auto px-1 pb-1">
        {tab === "agents" && (
          <button
            onClick={onCreateAgent}
            className="mx-1 mt-2 flex w-[calc(100%-0.5rem)] items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-sm text-dim transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus className="size-4" /> 添加 Agent
          </button>
        )}

        {pool.length === 0 && filteredGroups.length === 0 ? (
          <p className="px-3 pt-8 text-center text-xs leading-relaxed text-mute">{emptyHint}</p>
        ) : q ? (
          // 搜索态：平铺结果，不分组
          <div className="mt-1">
            {pool.map((f) => (
              <FriendRow key={f.handle} friend={f} onOpenChat={onOpenChat} onContextMenu={onContextMenu} />
            ))}
            {pool.length === 0 && <p className="px-3 pt-4 text-center text-xs text-mute">没有匹配的{tab === "agents" ? " Agent" : "好友"}</p>}
          </div>
        ) : (
          <>
            {renderSection("inapp", "正在使用", inApp)}
            {renderSection("online", "在线", online)}
            {renderSection("offline", "离线", offline)}
          </>
        )}

        {/* 群组聊天（Steam GROUP CHATS） */}
        {showGroups && (
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
        )}
      </div>
      <div className="border-t border-line px-3 py-1.5 text-center text-[10px] text-mute">单击打开聊天 · 右键更多操作</div>
    </>
  );
}

// ———————————————————— 添加好友 ————————————————————

/** 搜索结果行的动作按钮（按与我的关系切换） */
function ResultAction({
  res,
  pending,
  onAdd,
  onAccept,
  onMessage,
}: {
  res: UserSearchResult;
  pending: boolean;
  onAdd: () => void;
  onAccept: () => void;
  onMessage: () => void;
}) {
  if (res.relation === "self") return <span className="shrink-0 text-[11px] text-mute">你自己</span>;
  if (res.relation === "friends")
    return (
      <button onClick={onMessage} className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent">
        <MessageSquare className="size-3" /> 发消息
      </button>
    );
  if (res.relation === "outgoing" || pending)
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-mute">
        <Clock className="size-3" /> 已申请
      </span>
    );
  if (res.relation === "incoming")
    return (
      <button onClick={onAccept} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep">
        <UserCheck className="size-3" /> 接受
      </button>
    );
  return (
    <button onClick={onAdd} className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep">
      <UserPlus className="size-3" /> 添加
    </button>
  );
}

export function AddFriendView({
  myCode,
  requests,
  onBack,
  onSearch,
  onAdd,
  onRespond,
  loadRecent,
  onOpenChat,
}: {
  myCode: string | null;
  requests: FriendRequestView[];
  onBack: () => void;
  onSearch: (q: string) => Promise<UserSearchResult[]>;
  onAdd: (h: string) => Promise<{ ok: boolean; error?: string }>;
  onRespond: (edgeId: string, decision: "accept" | "reject" | "ignore") => Promise<void>;
  loadRecent: () => Promise<Friend[]>;
  onOpenChat: (h: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recent, setRecent] = useState<Friend[]>([]);
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [handledReqs, setHandledReqs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const searchToken = useRef(0);

  // 最近添加（挂载时取一次）
  useEffect(() => {
    let alive = true;
    loadRecent().then((r) => alive && setRecent(r)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [loadRecent]);

  // 搜索（300ms 防抖；token 防竞态）。token 先自增，使清空查询也能让在途请求失效，避免旧结果回填
  useEffect(() => {
    const term = q.trim();
    const token = ++searchToken.current;
    if (!term) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await onSearch(term);
        if (searchToken.current === token) setResults(r);
      } catch {
        if (searchToken.current === token) setResults([]);
      } finally {
        if (searchToken.current === token) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, onSearch]);

  const add = async (handle: string) => {
    setError(null);
    setPendingAdds((s) => new Set(s).add(handle));
    const res = await onAdd(handle);
    if (!res.ok) {
      setError(res.error ?? "添加失败");
      setPendingAdds((s) => {
        const n = new Set(s);
        n.delete(handle);
        return n;
      });
    }
  };

  const accept = async (res: UserSearchResult) => {
    if (!res.edgeId) return;
    await onRespond(res.edgeId, "accept");
    setResults((cur) => cur?.map((r) => (r.handle === res.handle ? { ...r, relation: "friends" } : r)) ?? cur);
  };

  const respond = async (edgeId: string, decision: "accept" | "reject" | "ignore") => {
    setHandledReqs((s) => new Set(s).add(edgeId));
    await onRespond(edgeId, decision);
  };

  const visibleReqs = requests.filter((r) => !handledReqs.has(r.edgeId));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <button onClick={onBack} className="rounded-lg p-1 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="返回">
          <X className="size-4" />
        </button>
        <p className="text-sm font-medium">添加好友</p>
      </div>

      <div className="grow space-y-4 overflow-y-auto p-3">
        {/* 我的好友码 */}
        {myCode && (
          <div className="rounded-xl border border-line bg-card-hi p-3">
            <p className="text-[11px] text-mute">你的好友码 · 把这串数字给朋友，对方搜索即可加你</p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="grow font-mono text-xl font-bold tracking-[0.2em] text-accent">{myCode}</code>
              <button
                onClick={async () => {
                  if (await copyText(myCode)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }
                }}
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs text-dim transition-colors hover:border-accent/50 hover:text-accent"
                aria-label="复制好友码"
              >
                {copied ? <span className="text-free">已复制</span> : <><Copy className="size-3" /> 复制</>}
              </button>
            </div>
          </div>
        )}

        {/* 搜索加好友 */}
        <div>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-page px-2.5 py-2 text-sm text-mute focus-within:border-accent">
            <Search className="size-3.5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入好友码或昵称查找"
              className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none"
              autoFocus
            />
            {q && (
              <button onClick={() => setQ("")} className="text-mute transition-colors hover:text-ink" aria-label="清除">
                <X className="size-3.5" />
              </button>
            )}
          </label>
          {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        </div>

        {/* 搜索结果 */}
        {q.trim() ? (
          <div className="space-y-1">
            {searching && results === null ? (
              <p className="px-1 py-3 text-center text-xs text-mute">搜索中…</p>
            ) : results && results.length > 0 ? (
              results.map((r) => (
                <div key={r.handle} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-card-hi">
                  <Avatar name={r.name} hue={r.avatarHue} src={r.avatarUrl} size="sm" />
                  <span className="min-w-0 grow leading-tight">
                    <span className="block truncate text-sm text-ink">{r.name}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-mute">
                      <span className="truncate">@{r.handle}</span>
                      {r.friendCode && <span className="shrink-0 font-mono text-accent/80">{r.friendCode}</span>}
                    </span>
                  </span>
                  <ResultAction
                    res={r}
                    pending={pendingAdds.has(r.handle)}
                    onAdd={() => add(r.handle)}
                    onAccept={() => accept(r)}
                    onMessage={() => onOpenChat(r.handle)}
                  />
                </div>
              ))
            ) : (
              <p className="px-1 py-3 text-center text-xs text-mute">没有找到匹配的用户</p>
            )}
          </div>
        ) : (
          <>
            {/* 好友申请 */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold tracking-wide text-mute">
                <UserPlus className="size-3.5" /> 好友申请{visibleReqs.length > 0 && ` (${visibleReqs.length})`}
              </p>
              {visibleReqs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-xs text-mute">暂无待处理的好友申请</p>
              ) : (
                <ul className="space-y-1">
                  {visibleReqs.map((req) => (
                    <li key={req.edgeId} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-card-hi">
                      <Avatar name={req.fromName} hue={req.fromHue} src={req.fromAvatarUrl} size="sm" />
                      <span className="min-w-0 grow leading-tight">
                        <span className="block truncate text-sm text-ink">{req.fromName}</span>
                        <span className="block truncate text-[11px] text-mute">
                          @{req.fromHandle}{req.at ? ` · ${timeAgo(req.at)}` : ""}
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => respond(req.edgeId, "accept")}
                          className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-deep"
                          title="同意"
                        >
                          <Check className="size-3" /> 同意
                        </button>
                        <button
                          onClick={() => respond(req.edgeId, "ignore")}
                          className="rounded-lg border border-line px-2 py-1 text-xs text-dim transition-colors hover:bg-card-hi hover:text-ink"
                          title="忽略（不再提示，对方不会被告知）"
                        >
                          忽略
                        </button>
                        <button
                          onClick={() => respond(req.edgeId, "reject")}
                          className="rounded-lg p-1 text-mute transition-colors hover:bg-danger/10 hover:text-danger"
                          title="拒绝"
                          aria-label="拒绝"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 最近添加 */}
            {recent.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold tracking-wide text-mute">
                  <Users className="size-3.5" /> 最近添加
                </p>
                <div className="space-y-0.5">
                  {recent.map((f) => {
                    const meta = presenceMeta[f.presence.kind];
                    return (
                      <button
                        key={f.handle}
                        onClick={() => onOpenChat(f.handle)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-card-hi"
                      >
                        <span className="relative shrink-0">
                          <Avatar name={display(f)} hue={f.avatarHue} src={f.avatarUrl} size="sm" />
                          <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
                        </span>
                        <span className="min-w-0 leading-tight">
                          <span className="flex items-center gap-1 truncate text-sm text-ink">
                            {f.name}
                            {f.isAgent && <Bot className="size-3 shrink-0 opacity-70" />}
                          </span>
                          <span className={cn("block truncate text-[11px]", f.presence.kind === "offline" ? "text-mute" : meta.tone)}>{statusText(f)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export type { GroupMember, GroupSummary };
