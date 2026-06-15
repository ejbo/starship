"use client";
import { useEffect, useState } from "react";
import { FriendsPanel, type Me } from "@/components/social/friends-panel";
import type { Friend } from "@/lib/types";
import type { GroupSummary } from "@/lib/group-service";
import type { FriendRequestView } from "@/lib/friends-service";

/** 关闭覆盖层：通知桌面壳隐藏窗口（preload 暴露的 starportOverlay.close）；浏览器里则无操作。 */
function closeOverlay() {
  (window as unknown as { starportOverlay?: { close?: () => void } }).starportOverlay?.close?.();
}

/**
 * 覆盖层社交（Steam 式）：右侧停靠平台「真实」FriendsPanel，半透明 dim 背景透出底下应用。
 * v1 以好友列表/在线状态为主（真实组件、真实数据、永远同步）；聊天/写操作下一阶段接全量 SocialLayer。
 */
export function OverlayClient({
  me,
  friends = [],
  groups = [],
  requests = [],
  loggedOut,
}: {
  me?: Me;
  friends?: Friend[];
  groups?: GroupSummary[];
  requests?: FriendRequestView[];
  loggedOut?: boolean;
}) {
  const [query, setQuery] = useState("");

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loggedOut || !me) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black/40" onClick={closeOverlay}>
        <div className="rounded-xl border border-line bg-panel px-6 py-5 text-center text-ink shadow-2xl">
          <p className="mb-3 text-sm">未登录星港</p>
          <a href="/login" className="text-sm font-medium text-accent underline">
            去登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-screen justify-end bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeOverlay();
      }}
    >
      <div className="flex h-full w-80 flex-col border-l border-line bg-panel text-ink shadow-2xl">
        <FriendsPanel
          me={me}
          myPresence={me.presence}
          friends={friends}
          groups={groups}
          requestCount={requests.length}
          query={query}
          onQuery={setQuery}
          onClose={closeOverlay}
          onAdd={() => {}}
          onOpenChat={() => {}}
          onOpenGroup={() => {}}
          onCreateGroup={() => {}}
          onCreateAgent={() => {}}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  );
}
