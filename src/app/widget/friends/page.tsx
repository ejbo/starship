"use client";
import { useEffect, useRef, useState } from "react";
import { FriendsPanel, type Me } from "@/components/social/friends-panel";
import type { Friend } from "@/lib/types";
import type { GroupSummary } from "@/lib/group-service";

interface Snapshot {
  me: Me | null;
  friends: Friend[];
  groups: GroupSummary[];
  requestCount: number;
}

/**
 * 嵌入式好友面板（接入应用用 iframe 嵌它，渲染的是平台「真实」FriendsPanel 组件）。
 * 鉴权：父窗口（接入应用）经 postMessage 把 OAuth 令牌发来 → 本页用 Bearer 拉 /api/v1/social/snapshot。
 * 用 fixed 全覆盖，盖住平台外壳（nav/footer），iframe 里只见好友面板本体。
 */
export default function FriendsWidgetPage() {
  const [token, setToken] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [query, setQuery] = useState("");
  const parentOrigin = useRef<string>("*");

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; token?: string } | null;
      if (d && d.type === "starport-token" && typeof d.token === "string") {
        parentOrigin.current = e.origin || "*";
        setToken(d.token);
      }
    };
    window.addEventListener("message", onMsg);
    // 通知父窗口：widget 就绪，把令牌发来
    try {
      window.parent.postMessage({ type: "starport-widget-ready" }, "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const pull = () =>
      fetch("/api/v1/social/snapshot", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d) setSnap(d as Snapshot);
        })
        .catch(() => {});
    pull();
    const t = setInterval(pull, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token]);

  const reply = (msg: unknown) => {
    try {
      window.parent.postMessage(msg, parentOrigin.current);
    } catch {
      /* ignore */
    }
  };
  // 互动（聊天/加好友/群组）暂转到平台完整社交（新标签页），面板本体只读但与平台像素一致。
  const openPlatform = (path: string) => window.open(path, "_blank", "noopener");

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-panel text-ink">
      {snap?.me ? (
        <FriendsPanel
          me={snap.me}
          myPresence={snap.me.presence}
          friends={snap.friends}
          groups={snap.groups}
          requestCount={snap.requestCount}
          query={query}
          onQuery={setQuery}
          onClose={() => reply({ type: "starport-widget-close" })}
          onAdd={() => openPlatform("/")}
          onOpenChat={() => openPlatform("/")}
          onOpenGroup={() => openPlatform("/")}
          onCreateGroup={() => openPlatform("/")}
          onCreateAgent={() => openPlatform("/")}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-mute">
          {token ? "加载好友中…" : "连接星港中…"}
        </div>
      )}
    </div>
  );
}
