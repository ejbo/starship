"use client";

import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatPlaytimeShort } from "@/lib/playtime";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

export interface FriendPlay {
  friend: Friend;
  usageMinutes: number;
  lastUsedAt: string | null;
}

const dotColor: Record<PresenceKind, string> = {
  using: "bg-green",
  meeting: "bg-purple",
  online: "bg-accent",
  offline: "bg-mute",
};

function openChat(handle: string) {
  window.dispatchEvent(new CustomEvent("starport:open-chat", { detail: { handle } }));
}
function openMenu(e: React.MouseEvent, friend: Friend) {
  e.preventDefault();
  window.dispatchEvent(new CustomEvent("starport:friend-menu", { detail: { friend, x: e.clientX, y: e.clientY } }));
}

function Row({ fp, sub, subTone }: { fp: FriendPlay; sub: string; subTone?: string }) {
  const f = fp.friend;
  return (
    <button
      onDoubleClick={() => openChat(f.handle)}
      onContextMenu={(e) => openMenu(e, f)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-hi"
    >
      <span className="relative shrink-0">
        <Avatar name={f.remark || f.name} hue={f.avatarHue} src={f.avatarUrl} size="sm" />
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card", dotColor[f.presence.kind])} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium">{f.remark || f.name}</span>
        <span className={cn("block truncate text-[11px]", subTone ?? "text-mute")}>{sub}</span>
      </span>
    </button>
  );
}

/** 库详情页右栏：哪些好友在玩（正在使用 / 最近使用 / 也拥有），双击聊天、右键更多。 */
export function FriendsWhoPlay({ slug, friends }: { slug: string; friends: FriendPlay[] }) {
  const usingNow = friends.filter((f) => f.friend.presence.kind === "using" && f.friend.presence.appSlug === slug);
  const usingSet = new Set(usingNow.map((f) => f.friend.handle));
  const recent = friends
    .filter((f) => !usingSet.has(f.friend.handle) && f.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""));
  const recentSet = new Set(recent.map((f) => f.friend.handle));
  const others = friends.filter((f) => !usingSet.has(f.friend.handle) && !recentSet.has(f.friend.handle));

  return (
    <aside className="capsule space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Users className="size-4" /> 在玩的好友
      </h2>

      {friends.length === 0 ? (
        <p className="py-2 text-xs text-dim">还没有好友拥有这款应用。</p>
      ) : (
        <>
          {usingNow.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2 text-[11px] font-medium text-green">正在使用（{usingNow.length}）</p>
              {usingNow.map((fp) => (
                <Row key={fp.friend.handle} fp={fp} sub="正在使用" subTone="text-green" />
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2 text-[11px] font-medium text-dim">最近使用（{recent.length}）</p>
              {recent.map((fp) => (
                <Row key={fp.friend.handle} fp={fp} sub={`玩了 ${formatPlaytimeShort(fp.usageMinutes)}`} />
              ))}
            </div>
          )}
          {others.length > 0 && (
            <div className="space-y-0.5">
              <p className="px-2 text-[11px] font-medium text-dim">也拥有（{others.length}）</p>
              {others.map((fp) => (
                <Row key={fp.friend.handle} fp={fp} sub="已拥有" />
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
