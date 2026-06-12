"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, MessageSquare, Store, UserMinus, Users } from "lucide-react";
import {
  acceptRequestAction,
  addFriendAction,
  createGroupAction,
  inviteToGroupAction,
  loadChannelAction,
  loadConversationAction,
  loadUnreadCountsAction,
  pollUpdatesAction,
  refreshGroupsAction,
  refreshSocialAction,
  removeFriendAction,
  sendGroupMessageAction,
  sendMessageAction,
  setRemarkAction,
} from "@/app/friends-actions";
import { cn } from "@/lib/cn";
import type { FriendRequestView } from "@/lib/friends-service";
import type { GroupSummary } from "@/lib/group-service";
import type { ChatMessage } from "@/lib/message-service";
import type { Friend } from "@/lib/types";
import { channelConvKey, channelIdOf, ChatWindow, groupIdOf, groupKey, isChannelConvKey, isGroupKey, type SendPayload } from "./chat-window";
import { AddFriendView, FriendsPanel, type Me } from "./friends-panel";
import { GroupModal } from "./group-modal";
import { MiniProfileLayer } from "./mini-profile";
import { display, type Conversation, type MsgSender, type ViewMessage } from "./presence";

export type { Me };

interface ContextMenuState {
  friend: Friend;
  x: number;
  y: number;
}
interface Toast {
  id: number;
  title: string;
  body: string;
  chatKey: string;
}
type ModalState = { mode: "create"; preselect: string[] } | { mode: "invite"; groupId: string };

const preview = (kind: string, body: string, attachmentName?: string | null) =>
  kind === "image" ? "[图片]" : kind === "file" ? `[文件] ${attachmentName ?? ""}` : body;

let toastSeq = 0; // 同一轮 poll 多条消息时 Date.now() 会碰撞，自增保证唯一

export function SocialLayer({
  me,
  initialFriends,
  initialGroups,
  initialRequests,
}: {
  me: Me;
  initialFriends: Friend[];
  initialGroups: GroupSummary[];
  initialRequests: FriendRequestView[];
}) {
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [groups, setGroups] = useState<GroupSummary[]>(initialGroups);
  const [requests, setRequests] = useState<FriendRequestView[]>(initialRequests);
  const [myPresence, setMyPresence] = useState(me.presence);
  const [dockOpen, setDockOpen] = useState(false);
  const [view, setView] = useState<"list" | "add">("list");
  const [query, setQuery] = useState("");

  const [openChats, setOpenChats] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [channelSel, setChannelSel] = useState<Record<string, string>>({});
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [markers, setMarkers] = useState<Record<string, string | null>>({});
  const [mutedGroups, setMutedGroups] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [restored, setRestored] = useState(false);

  const activeChatRef = useRef<string | null>(null);
  activeChatRef.current = activeChat;
  const channelSelRef = useRef(channelSel);
  channelSelRef.current = channelSel;
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const mutedRef = useRef(mutedGroups);
  mutedRef.current = mutedGroups;
  const markersRef = useRef(markers);
  markersRef.current = markers;
  /** 已被用户看过一次的未读分隔线（再次打开时清除，Steam 行为） */
  const markerSeenRef = useRef<Set<string>>(new Set());

  const meSender: MsgSender = { handle: me.handle, name: me.name, avatarHue: me.avatarHue, avatarUrl: me.avatarUrl };

  // localStorage 按账号命名空间（同机切换账号不串台）
  const DOCK_KEY = `starport_dock_state:${me.handle}`;
  const MUTE_KEY = `starport_muted_groups:${me.handle}`;

  // —— 恢复坞/会话开关状态（跨刷新保留） ——
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOCK_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.dockOpen) setDockOpen(true);
        if (Array.isArray(s.openChats)) setOpenChats(s.openChats);
        if (s.activeChat) setActiveChat(s.activeChat);
        if (s.channelSel && typeof s.channelSel === "object") setChannelSel(s.channelSel);
      }
      const muted = localStorage.getItem(MUTE_KEY);
      if (muted) setMutedGroups(new Set(JSON.parse(muted)));
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, []);

  // —— 持久化坞/会话开关状态 ——
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(DOCK_KEY, JSON.stringify({ dockOpen, openChats, activeChat, channelSel }));
    } catch {
      /* ignore */
    }
  }, [restored, dockOpen, openChats, activeChat, channelSel]);

  const refresh = useCallback(async () => {
    const res = await refreshSocialAction();
    setFriends(res.friends);
    setRequests(res.requests);
  }, []);

  const refreshGroups = useCallback(async () => {
    const gs = await refreshGroupsAction();
    setGroups(gs);
    groupsRef.current = gs; // 立即同步：同一微任务里（如建群后 openGroup）能拿到新群，不等下次 render
    return gs;
  }, []);

  // 私聊未读角标持久化：挂载时取回离线期间累计的未读数
  useEffect(() => {
    let alive = true;
    loadUnreadCountsAction()
      .then((counts) => {
        if (alive && Object.keys(counts).length > 0) setUnread((u) => ({ ...counts, ...u }));
      })
      .catch(() => {
        /* 忽略，轮询会继续累计 */
      });
    return () => {
      alive = false;
    };
  }, []);

  // —— 会话加载（好友 → handle；群组频道 → c:<channelId>） ——
  const loadedRef = useRef<Set<string>>(new Set());

  const mapFriendMessages = useCallback(
    (handle: string, messages: ChatMessage[]): ViewMessage[] => {
      const f = friendsRef.current.find((x) => x.handle === handle);
      const friendSender: MsgSender = f
        ? { handle: f.handle, name: f.name, avatarHue: f.avatarHue, avatarUrl: f.avatarUrl }
        : { handle, name: handle, avatarHue: 0, avatarUrl: null };
      return messages.map((m) => ({
        id: m.id,
        kind: m.kind,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        at: m.at,
        sender: m.from === "me" ? meSender : friendSender,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const ensureLoaded = useCallback(
    async (convKey: string) => {
      if (loadedRef.current.has(convKey)) return;
      loadedRef.current.add(convKey);
      setConversations((c) => (c[convKey] ? c : { ...c, [convKey]: { messages: [], hasMore: false, loaded: false } }));
      try {
        const page = isChannelConvKey(convKey)
          ? await loadChannelAction(channelIdOf(convKey))
          : await loadConversationAction(convKey).then((p) => ({ messages: mapFriendMessages(convKey, p.messages), hasMore: p.hasMore }));
        setConversations((c) => {
          // 加载在途时轮询/乐观发送可能已 append：按 id 合并，别整体覆盖
          const pending = (c[convKey]?.messages ?? []).filter((m) => !page.messages.some((p) => p.id === m.id));
          return { ...c, [convKey]: { messages: [...page.messages, ...pending], hasMore: page.hasMore, loaded: true } };
        });
      } catch {
        loadedRef.current.delete(convKey); // 失败可重试，不让会话永久停在空占位
        setConversations((c) => {
          if (!c[convKey] || c[convKey].messages.length > 0) return c;
          const { [convKey]: _, ...rest } = c;
          return rest;
        });
      }
    },
    [mapFriendMessages],
  );

  /** 进入会话视图时的未读分隔线处理：第一次保留展示，第二次进入清掉（副作用不能放进 setState updater） */
  const touchMarker = useCallback((convKey: string) => {
    if (!markersRef.current[convKey]) return;
    if (markerSeenRef.current.has(convKey)) {
      markerSeenRef.current.delete(convKey);
      setMarkers((cur) => ({ ...cur, [convKey]: null }));
    } else {
      markerSeenRef.current.add(convKey);
    }
  }, []);

  /** 群组的当前频道（没选过或所选频道已删 → 第一个文字频道） */
  const currentChannelId = useCallback((g: GroupSummary): string | null => {
    const sel = channelSelRef.current[g.id];
    if (sel && g.channels.some((c) => c.id === sel)) return sel;
    return g.channels.find((c) => c.kind === "text")?.id ?? null;
  }, []);

  /** 清某频道未读，群 tab 计数重算为其余频道之和 */
  const clearChannelUnread = useCallback((groupId: string, channelId: string) => {
    const g = groupsRef.current.find((x) => x.id === groupId);
    setUnread((u) => {
      const next = { ...u, [channelConvKey(channelId)]: 0 };
      next[groupKey(groupId)] = (g?.channels ?? []).reduce((acc, c) => acc + (next[channelConvKey(c.id)] ?? 0), 0);
      return next;
    });
  }, []);

  const activateKey = useCallback(
    (key: string) => {
      setActiveChat(key);
      if (isGroupKey(key)) {
        const g = groupsRef.current.find((x) => x.id === groupIdOf(key));
        const cid = g ? currentChannelId(g) : null;
        if (cid) {
          clearChannelUnread(g!.id, cid);
          touchMarker(channelConvKey(cid));
        }
      } else {
        setUnread((u) => ({ ...u, [key]: 0 }));
        touchMarker(key);
      }
    },
    [clearChannelUnread, currentChannelId, touchMarker],
  );

  const openChat = useCallback(
    async (handle: string) => {
      setOpenChats((cur) => (cur.includes(handle) ? cur : [...cur, handle]));
      activateKey(handle);
      await ensureLoaded(handle);
    },
    [activateKey, ensureLoaded],
  );

  const openGroup = useCallback(
    async (groupId: string) => {
      const key = groupKey(groupId);
      setOpenChats((cur) => (cur.includes(key) ? cur : [...cur, key]));
      const g = groupsRef.current.find((x) => x.id === groupId);
      const cid = g ? currentChannelId(g) : null;
      if (cid) {
        setChannelSel((cur) => (cur[groupId] ? cur : { ...cur, [groupId]: cid }));
        await ensureLoaded(channelConvKey(cid));
      }
      activateKey(key);
    },
    [activateKey, currentChannelId, ensureLoaded],
  );

  const openChatKey = useCallback(
    (key: string) => (isGroupKey(key) ? openGroup(groupIdOf(key)) : openChat(key)),
    [openChat, openGroup],
  );

  const selectChannel = useCallback(
    async (groupId: string, channelId: string) => {
      setChannelSel((cur) => ({ ...cur, [groupId]: channelId }));
      clearChannelUnread(groupId, channelId); // 看到内容即清未读，不然 dock 红点残留
      await ensureLoaded(channelConvKey(channelId));
      touchMarker(channelConvKey(channelId));
    },
    [clearChannelUnread, ensureLoaded, touchMarker],
  );

  // 恢复时预加载已打开的会话
  useEffect(() => {
    if (!restored) return;
    openChats.forEach((key) => {
      if (isGroupKey(key)) {
        const g = groupsRef.current.find((x) => x.id === groupIdOf(key));
        const cid = g ? currentChannelId(g) : null;
        if (cid) void ensureLoaded(channelConvKey(cid));
      } else {
        void ensureLoaded(key);
      }
    });
  }, [restored, openChats, ensureLoaded, currentChannelId]);

  const loadOlder = useCallback(async (convKey: string) => {
    const conv = conversationsRef.current[convKey];
    if (!conv || !conv.hasMore || conv.messages.length === 0) return false;
    const oldest = conv.messages[0].at;
    const merge = (messages: ViewMessage[], hasMore: boolean) =>
      setConversations((c) => {
        const prev = c[convKey];
        if (!prev) return c;
        return { ...c, [convKey]: { messages: [...messages, ...prev.messages], hasMore } };
      });
    if (isChannelConvKey(convKey)) {
      const page = await loadChannelAction(channelIdOf(convKey), oldest);
      merge(page.messages, page.hasMore);
    } else {
      const page = await loadConversationAction(convKey, oldest);
      merge(mapFriendMessages(convKey, page.messages), page.hasMore);
    }
    return true;
  }, [mapFriendMessages]);

  const closeChat = useCallback((key: string) => {
    setOpenChats((cur) => {
      const next = cur.filter((h) => h !== key);
      setActiveChat((a) => (a === key ? next[next.length - 1] ?? null : a));
      return next;
    });
  }, []);

  const closeWindow = useCallback(() => {
    setOpenChats([]);
    setActiveChat(null);
  }, []);

  // 退群/被移出/被删好友后，自动关掉失效的 tab（脏 key 会渲染出空壳窗口）
  useEffect(() => {
    const groupIds = new Set(groups.map((g) => g.id));
    const handles = new Set(friends.map((f) => f.handle));
    setOpenChats((cur) => {
      const next = cur.filter((key) => (isGroupKey(key) ? groupIds.has(groupIdOf(key)) : handles.has(key)));
      if (next.length === cur.length) return cur;
      setActiveChat((a) => (a && next.includes(a) ? a : next[next.length - 1] ?? null));
      return next;
    });
  }, [groups, friends]);

  const appendMessage = useCallback((convKey: string, msg: ViewMessage) => {
    setConversations((c) => {
      const conv = c[convKey];
      if (!conv || conv.messages.some((m) => m.id === msg.id)) return c; // 按 id 去重兜底
      return { ...c, [convKey]: { ...conv, messages: [...conv.messages, msg] } };
    });
  }, []);

  const markUnread = useCallback((chatKey: string, convKey: string, msgId: string) => {
    setUnread((u) => ({
      ...u,
      [chatKey]: (u[chatKey] ?? 0) + 1,
      ...(convKey !== chatKey ? { [convKey]: (u[convKey] ?? 0) + 1 } : {}), // 群按频道另计（频道栏角标）
    }));
    // 用户看过当前 marker 之后又来新消息 → 分隔线重定位到新消息，否则保留首条未读位置
    const relocate = markerSeenRef.current.has(convKey) || !markersRef.current[convKey];
    if (relocate) setMarkers((cur) => ({ ...cur, [convKey]: msgId }));
    markerSeenRef.current.delete(convKey);
  }, []);

  const pushToast = useCallback((title: string, body: string, chatKey: string) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, title, body, chatKey }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // —— 轮询：新私聊/群聊消息 + 好友/群组/请求/状态（每 2s） ——
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
        setGroups(res.groups);
        setRequests(res.requests);
        setMyPresence(res.myPresence);

        for (const m of res.messages) {
          const handle = m.from;
          const f = res.friends.find((x) => x.handle === handle);
          appendMessage(handle, {
            id: m.id,
            kind: m.kind,
            body: m.body,
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            at: m.at,
            sender: { handle, name: m.fromName, avatarHue: f?.avatarHue ?? 0, avatarUrl: f?.avatarUrl ?? null },
          });
          if (activeChatRef.current !== handle) {
            markUnread(handle, handle, m.id);
            pushToast(m.fromName, preview(m.kind, m.body, m.attachmentName), handle);
          }
        }

        for (const m of res.groupMessages) {
          const chatKey = groupKey(m.groupId);
          const convKey = channelConvKey(m.channelId);
          appendMessage(convKey, m);
          // 「正在看」的频道判定要与渲染的 fallback 一致（channelSel 缺失时渲染的是第一个文字频道）
          const g = res.groups.find((x) => x.id === m.groupId);
          const sel = channelSelRef.current[m.groupId];
          const effective = sel && g?.channels.some((c) => c.id === sel) ? sel : g?.channels.find((c) => c.kind === "text")?.id;
          const watching = activeChatRef.current === chatKey && effective === m.channelId;
          if (!watching) {
            markUnread(chatKey, convKey, m.id);
            if (!mutedRef.current.has(m.groupId)) {
              pushToast(`${g?.name ?? "群组"} · ${m.sender.name}`, preview(m.kind, m.body, m.attachmentName), chatKey);
            }
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
  }, [appendMessage, markUnread, pushToast]);

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

  const sendChat = useCallback(
    async (convKey: string, body: string, input?: SendPayload) => {
      const optimistic: ViewMessage = {
        id: `tmp-${Date.now()}-${Math.random()}`,
        kind: input?.kind ?? "text",
        body,
        attachmentUrl: input?.attachmentUrl ?? null,
        attachmentName: input?.attachmentName ?? null,
        at: new Date().toISOString(),
        sender: meSender,
      };
      setConversations((c) => {
        const prev = c[convKey] ?? { messages: [], hasMore: false };
        return { ...c, [convKey]: { ...prev, messages: [...prev.messages, optimistic] } };
      });
      setMarkers((cur) => (cur[convKey] ? { ...cur, [convKey]: null } : cur));
      markerSeenRef.current.delete(convKey);
      const payload = input ? { kind: input.kind, attachmentUrl: input.attachmentUrl, attachmentName: input.attachmentName } : undefined;
      try {
        if (isChannelConvKey(convKey)) await sendGroupMessageAction(channelIdOf(convKey), body, payload);
        else await sendMessageAction(convKey, body, payload);
      } catch {
        // 发送失败：撤掉乐观消息并提示，别让它冒充已送达
        setConversations((c) =>
          c[convKey] ? { ...c, [convKey]: { ...c[convKey], messages: c[convKey].messages.filter((m) => m.id !== optimistic.id) } } : c,
        );
        const chatKey = isChannelConvKey(convKey)
          ? groupKey(groupsRef.current.find((g) => g.channels.some((ch) => ch.id === channelIdOf(convKey)))?.id ?? "")
          : convKey;
        pushToast("发送失败", "网络异常或没有权限，消息未送达", chatKey);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pushToast],
  );

  const toggleMute = useCallback((groupId: string) => {
    setMutedGroups((cur) => {
      const next = new Set(cur);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      try {
        localStorage.setItem(MUTE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent, friend: Friend) => {
    e.preventDefault();
    setMenu({ friend, x: e.clientX, y: e.clientY });
  }, []);

  // 频道级计数（c: 前缀）只是群计数的明细，总数里排除避免双计
  const totalUnread = Object.entries(unread).reduce((a, [k, v]) => (k.startsWith("c:") ? a : a + v), 0);
  const onlineCount = friends.filter((f) => f.presence.kind !== "offline").length;

  const modalGroup = modal?.mode === "invite" ? groups.find((g) => g.id === modal.groupId) : null;

  return (
    <>
      <ChatWindow
        me={me}
        myPresence={myPresence}
        friends={friends}
        groups={groups}
        openChats={openChats}
        activeChat={activeChat}
        conversations={conversations}
        unread={unread}
        markers={markers}
        channelSel={channelSel}
        mutedGroups={mutedGroups}
        onActivate={activateKey}
        onCloseTab={closeChat}
        onCloseWindow={closeWindow}
        onSend={sendChat}
        onLoadOlder={loadOlder}
        onSelectChannel={selectChannel}
        onInvite={(groupId, preselect) => setModal(groupId ? { mode: "invite", groupId } : { mode: "create", preselect })}
        onToggleMute={toggleMute}
        onOpenChat={openChat}
        onGroupsChanged={refreshGroups}
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
                  void openChatKey(t.chatKey);
                  setToasts((cur) => cur.filter((x) => x.id !== t.id));
                }}
                className="flex w-64 items-start gap-2.5 rounded-xl border border-line bg-panel p-3 text-left shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]"
              >
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
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
              className="flex h-[min(34rem,calc(100vh-8rem))] w-[21rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
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
                  groups={groups}
                  requestCount={requests.length}
                  query={query}
                  onQuery={setQuery}
                  onClose={() => setDockOpen(false)}
                  onAdd={() => setView("add")}
                  onOpenChat={openChat}
                  onOpenGroup={openGroup}
                  onCreateGroup={() => setModal({ mode: "create", preselect: [] })}
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

      {/* 好友悬停迷你资料卡（全局层） */}
      <MiniProfileLayer />

      {/* 建群 / 邀请进群 */}
      {modal?.mode === "create" && (
        <GroupModal
          title="创建群组聊天"
          confirmLabel="创建群组"
          friends={friends}
          preselected={modal.preselect}
          withName
          onConfirm={async (handles, name) => {
            const res = await createGroupAction(handles, name);
            if (!res.ok || !res.groupId) throw new Error(res.error ?? "创建失败");
            await refreshGroups();
            await openGroup(res.groupId);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.mode === "invite" && modalGroup && (
        <GroupModal
          title={`邀请好友加入「${modalGroup.name}」`}
          confirmLabel="邀请"
          friends={friends}
          disabledHandles={modalGroup.members.map((m) => m.handle)}
          onConfirm={async (handles) => {
            await inviteToGroupAction(modalGroup.id, handles);
            await refreshGroups();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {menu && (
        <FriendContextMenu
          state={menu}
          onClose={() => setMenu(null)}
          onMessage={() => openChat(menu.friend.handle)}
          onInviteToGroup={() => setModal({ mode: "create", preselect: [menu.friend.handle] })}
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

// ———————————————————— 右键菜单 ————————————————————
function FriendContextMenu({
  state,
  onClose,
  onMessage,
  onInviteToGroup,
  onRemark,
  onRemove,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onMessage: () => void;
  onInviteToGroup: () => void;
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
    { label: "邀请到群组聊天", icon: Users, run: onInviteToGroup },
    { label: "设置备注", icon: Copy, run: onRemark },
    { label: "删除好友", icon: UserMinus, run: onRemove, danger: true },
  ];
  const left = Math.min(state.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 180);
  const top = Math.min(state.y, (typeof window !== "undefined" ? window.innerHeight : 9999) - 200);
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
