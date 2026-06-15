"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Copy, KeyRound, MessageSquare, Store, Terminal, Trash2, UserMinus, Users } from "lucide-react";
import { deleteAgentAction, getAgentCommandAction, resetAgentTokenAction, updateAgentPersonaAction, type ConnectorCommand } from "@/app/agents-actions";
import {
  addFriendAction,
  createGroupAction,
  deleteMessageAction,
  editMessageAction,
  inviteToGroupAction,
  joinVoiceRoomAction,
  leaveVoiceRoomAction,
  loadChannelAction,
  loadConversationAction,
  loadUnreadCountsAction,
  pollUpdatesAction,
  recentFriendsAction,
  refreshGroupsAction,
  refreshSocialAction,
  removeFriendAction,
  reportReadAction,
  reportTypingAction,
  respondRequestAction,
  searchUsersAction,
  sendGroupMessageAction,
  sendMessageAction,
  setMicAction,
  setRemarkAction,
  toggleReactionAction,
} from "@/app/friends-actions";
import { cn } from "@/lib/cn";
import type { FriendRequestView } from "@/lib/friends-service";
import type { GroupSummary } from "@/lib/group-service";
import type { ChatMessage } from "@/lib/message-service";
import type { Friend } from "@/lib/types";
import { AgentModal, ConnectorCommandModal, PersonaModal } from "./agent-modal";
import { channelConvKey, channelIdOf, ChatWindow, groupIdOf, groupKey, isChannelConvKey, isGroupKey, type SendPayload } from "./chat-window";
import type { VoiceRoomSnapshot } from "@/lib/voice-room-service";
import type { MessageMutation } from "./presence";
import { AddFriendView, FriendsPanel, type Me } from "./friends-panel";
import { GroupModal } from "./group-modal";
import { MiniProfileLayer } from "./mini-profile";
import { display, replyExcerpt, type Conversation, type MsgSender, type ViewMessage } from "./presence";

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
type ModalState =
  | { mode: "create"; preselect: string[] }
  | { mode: "invite"; groupId: string }
  | { mode: "agent-create" }
  | { mode: "agent-command"; command: ConnectorCommand; title?: string }
  | { mode: "agent-persona"; friend: Friend };

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
  /** convKey → 正在输入的人 */
  const [typing, setTyping] = useState<Record<string, { handle: string; name: string }[]>>({});
  /** convKey(DM) → 对方已读到的消息时刻 */
  const [reads, setReads] = useState<Record<string, string>>({});
  /** roomId(语音频道) → 在场成员 */
  const [voiceRooms, setVoiceRooms] = useState<Record<string, VoiceRoomSnapshot["members"]>>({});
  /** 我当前加入的语音房间 id */
  const [myVoiceRoom, setMyVoiceRoom] = useState<string | null>(null);
  const myVoiceRoomRef = useRef<string | null>(null);
  myVoiceRoomRef.current = myVoiceRoom;

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
  const openChatsRef = useRef(openChats);
  openChatsRef.current = openChats;
  /** 已被用户看过一次的未读分隔线（再次打开时清除，Steam 行为） */
  const markerSeenRef = useRef<Set<string>>(new Set());

  // —— 通知声（WebAudio，裸 http 可用；浏览器 autoplay 需先有交互） ——
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef = useRef(true);
  useEffect(() => {
    try {
      soundOnRef.current = localStorage.getItem("starport_sound_off") !== "1";
    } catch {
      /* ignore */
    }
    const mark = () => {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pointerdown", mark, { once: true });
    return () => window.removeEventListener("pointerdown", mark);
  }, []);
  const playPing = useCallback(() => {
    if (!soundOnRef.current) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1175, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      /* ignore */
    }
  }, []);

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
        ? { handle: f.handle, name: f.name, avatarHue: f.avatarHue, avatarUrl: f.avatarUrl, isAgent: f.isAgent }
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

  /** 把消息变更（编辑/删除/反应）原地打补丁到已加载消息上 */
  const patchMessage = useCallback((convKey: string, mut: MessageMutation) => {
    setConversations((c) => {
      const conv = c[convKey];
      if (!conv) return c;
      const idx = conv.messages.findIndex((m) => m.id === mut.id);
      if (idx === -1) return c;
      const cur = conv.messages[idx];
      // 幂等护栏：本地已是更新的态就跳过（防乱序/重复 poll 覆盖乐观更新）
      if (cur.updatedAt && mut.updatedAt && cur.updatedAt > mut.updatedAt) return c;
      const next = conv.messages.slice();
      next[idx] = { ...cur, body: mut.body, editedAt: mut.editedAt, deleted: mut.deleted, reactions: mut.reactions, updatedAt: mut.updatedAt };
      return { ...c, [convKey]: { ...conv, messages: next } };
    });
  }, []);

  /** 乐观地本地改一条消息（发反应/编辑/删除立即生效） */
  const optimisticPatch = useCallback((convKey: string, id: string, patch: Partial<ViewMessage>) => {
    setConversations((c) => {
      const conv = c[convKey];
      if (!conv) return c;
      const idx = conv.messages.findIndex((m) => m.id === id);
      if (idx === -1) return c;
      const next = conv.messages.slice();
      next[idx] = { ...next[idx], ...patch, updatedAt: new Date().toISOString() };
      return { ...c, [convKey]: { ...conv, messages: next } };
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

  // —— 轮询：新消息 + 消息变更 + typing/已读 + 语音房间 + 好友/群组/状态（每 2s） ——
  const sinceRef = useRef<string>(new Date().toISOString());
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        // 收窄查询：只查打开的会话（typing/已读）+ 可见语音频道
        const openConvKeys: string[] = [];
        for (const key of openChatsRef.current) {
          if (isGroupKey(key)) {
            const g = groupsRef.current.find((x) => x.id === groupIdOf(key));
            const cid = g ? currentChannelId(g) : null;
            if (cid) openConvKeys.push(channelConvKey(cid));
          } else openConvKeys.push(key);
        }
        const voiceRoomIds = groupsRef.current.flatMap((g) => g.channels.filter((c) => c.kind === "voice").map((c) => c.id));

        const res = await pollUpdatesAction(sinceRef.current, openConvKeys, voiceRoomIds);
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
            replyTo: m.replyTo,
            updatedAt: m.updatedAt,
            reactions: [],
            sender: { handle, name: m.fromName, avatarHue: f?.avatarHue ?? 0, avatarUrl: f?.avatarUrl ?? null, isAgent: f?.isAgent },
          });
          if (activeChatRef.current !== handle) {
            markUnread(handle, handle, m.id);
            pushToast(m.fromName, preview(m.kind, m.body, m.attachmentName), handle);
            playPing();
          }
        }

        for (const m of res.groupMessages) {
          const chatKey = groupKey(m.groupId);
          const convKey = channelConvKey(m.channelId);
          appendMessage(convKey, m);
          const g = res.groups.find((x) => x.id === m.groupId);
          const sel = channelSelRef.current[m.groupId];
          const effective = sel && g?.channels.some((c) => c.id === sel) ? sel : g?.channels.find((c) => c.kind === "text")?.id;
          const watching = activeChatRef.current === chatKey && effective === m.channelId;
          if (!watching) {
            markUnread(chatKey, convKey, m.id);
            if (!mutedRef.current.has(m.groupId)) {
              pushToast(`${g?.name ?? "群组"} · ${m.sender.name}`, preview(m.kind, m.body, m.attachmentName), chatKey);
              playPing();
            }
          }
        }

        // 消息变更（编辑/删除/反应）增量 patch
        for (const mut of res.mutations.dm) patchMessage(mut.convKey, mut);
        for (const mut of res.mutations.group) patchMessage(channelConvKey(mut.convKey), mut);

        // typing / 已读 / 语音房间
        setTyping(Object.fromEntries(res.typing.map((t) => [t.convKey, t.typers])));
        setReads(Object.fromEntries(res.reads.map((r) => [r.convKey, r.readAt])));
        setVoiceRooms(Object.fromEntries(res.voiceRooms.map((v) => [v.roomId, v.members])));
        // 被踢出/掉线兜底：服务端快照里没有我了 → 同步本地 myVoiceRoom
        if (myVoiceRoomRef.current) {
          const room = res.voiceRooms.find((v) => v.roomId === myVoiceRoomRef.current);
          if (!room || !room.members.some((mem) => mem.isMe)) setMyVoiceRoom(null);
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
  }, [appendMessage, markUnread, patchMessage, pushToast, currentChannelId]);

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

  const scopeOf = (convKey: string): "dm" | "group" => (isChannelConvKey(convKey) ? "group" : "dm");

  const sendChat = useCallback(
    async (convKey: string, body: string, input?: SendPayload) => {
      const replyTo = input?.replyToId
        ? conversationsRef.current[convKey]?.messages.find((m) => m.id === input.replyToId)
        : undefined;
      const optimistic: ViewMessage = {
        id: `tmp-${Date.now()}-${Math.random()}`,
        kind: input?.kind ?? "text",
        body,
        attachmentUrl: input?.attachmentUrl ?? null,
        attachmentName: input?.attachmentName ?? null,
        at: new Date().toISOString(),
        sender: meSender,
        reactions: [],
        replyTo: replyTo
          ? { id: replyTo.id, senderName: replyTo.sender.name, excerpt: replyExcerpt(replyTo), kind: replyTo.kind }
          : null,
      };
      setConversations((c) => {
        const prev = c[convKey] ?? { messages: [], hasMore: false };
        return { ...c, [convKey]: { ...prev, messages: [...prev.messages, optimistic] } };
      });
      setMarkers((cur) => (cur[convKey] ? { ...cur, [convKey]: null } : cur));
      markerSeenRef.current.delete(convKey);
      const payload = input ? { kind: input.kind, attachmentUrl: input.attachmentUrl, attachmentName: input.attachmentName, replyToId: input.replyToId } : undefined;
      try {
        const real = isChannelConvKey(convKey)
          ? await sendGroupMessageAction(channelIdOf(convKey), body, payload)
          : await sendMessageAction(convKey, body, payload);
        // 用真实 id 替换乐观消息（否则自己刚发的消息因 tmp id 无法被反应/编辑/删除）
        setConversations((c) => {
          const conv = c[convKey];
          if (!conv) return c;
          return {
            ...c,
            [convKey]: {
              ...conv,
              messages: conv.messages.map((m) =>
                m.id === optimistic.id ? { ...m, id: real.id, at: real.at, updatedAt: real.updatedAt ?? real.at, replyTo: real.replyTo ?? m.replyTo } : m,
              ),
            },
          };
        });
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

  // —— 消息交互：反应 / 编辑 / 删除（乐观更新 + action 回填，poll 兜底同步对端） ——
  const reactMessage = useCallback((convKey: string, messageId: string, emoji: string) => {
    if (messageId.startsWith("tmp-")) return;
    const conv = conversationsRef.current[convKey];
    const msg = conv?.messages.find((m) => m.id === messageId);
    if (!msg) return;
    const cur = msg.reactions ?? [];
    const existing = cur.find((r) => r.emoji === emoji);
    let next: typeof cur;
    if (existing?.mine) {
      next = cur.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r)).filter((r) => r.count > 0);
    } else if (existing) {
      next = cur.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r));
    } else {
      next = [...cur, { emoji, count: 1, mine: true }];
    }
    optimisticPatch(convKey, messageId, { reactions: next });
    void toggleReactionAction(scopeOf(convKey), messageId, emoji);
  }, [optimisticPatch]);

  const editMsg = useCallback(async (convKey: string, messageId: string, body: string) => {
    optimisticPatch(convKey, messageId, { body, editedAt: new Date().toISOString() });
    const res = await editMessageAction(scopeOf(convKey), messageId, body);
    if (!res.ok) pushToast("编辑失败", res.error ?? "", isChannelConvKey(convKey) ? "" : convKey);
  }, [optimisticPatch, pushToast]);

  const deleteMsg = useCallback(async (convKey: string, messageId: string) => {
    optimisticPatch(convKey, messageId, { deleted: true, body: "", attachmentUrl: null, reactions: [] });
    await deleteMessageAction(scopeOf(convKey), messageId);
  }, [optimisticPatch]);

  // —— typing 上报（节流 3s/会话） ——
  const lastTypingRef = useRef<Record<string, number>>({});
  const reportTyping = useCallback((convKey: string) => {
    const now = Date.now();
    if (now - (lastTypingRef.current[convKey] ?? 0) < 3000) return;
    lastTypingRef.current[convKey] = now;
    void reportTypingAction(convKey);
  }, []);

  // —— 已读上报（节流 2s/会话） ——
  const lastReadRef = useRef<Record<string, number>>({});
  const reportRead = useCallback((convKey: string) => {
    const conv = conversationsRef.current[convKey];
    const last = conv?.messages.filter((m) => m.sender.handle !== me.handle).slice(-1)[0];
    if (!last) return;
    const now = Date.now();
    if (now - (lastReadRef.current[convKey] ?? 0) < 2000) return;
    lastReadRef.current[convKey] = now;
    void reportReadAction(convKey, last.at);
  }, [me.handle]);

  // —— 语音房间 ——
  const joinVoice = useCallback(async (roomId: string) => {
    const res = await joinVoiceRoomAction(roomId);
    if (res.ok) setMyVoiceRoom(roomId);
    else pushToast("加入失败", res.error ?? "", "");
  }, [pushToast]);
  const leaveVoice = useCallback(async (roomId: string) => {
    setMyVoiceRoom((cur) => (cur === roomId ? null : cur));
    await leaveVoiceRoomAction(roomId);
  }, []);
  const toggleMyMic = useCallback(async (roomId: string, micOn: boolean) => {
    setVoiceRooms((rooms) => {
      const members = rooms[roomId];
      if (!members) return rooms;
      return { ...rooms, [roomId]: members.map((m) => (m.isMe ? { ...m, micOn } : m)) };
    });
    await setMicAction(roomId, micOn);
  }, []);

  // 关页面前主动离开语音房间（best-effort）
  useEffect(() => {
    const onUnload = () => {
      if (myVoiceRoomRef.current) void leaveVoiceRoomAction(myVoiceRoomRef.current);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

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
        typing={typing}
        reads={reads}
        voiceRooms={voiceRooms}
        myVoiceRoom={myVoiceRoom}
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
        onReact={reactMessage}
        onEdit={editMsg}
        onDelete={deleteMsg}
        onTyping={reportTyping}
        onRead={reportRead}
        onJoinVoice={joinVoice}
        onLeaveVoice={leaveVoice}
        onToggleMic={toggleMyMic}
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
              className="flex h-[min(46rem,calc(100vh-5rem))] w-[22rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_12px_40px_-12px_rgb(28_36_51/.25)]"
            >
              {view === "add" ? (
                <AddFriendView
                  myCode={me.friendCode}
                  requests={requests}
                  onBack={() => setView("list")}
                  onSearch={searchUsersAction}
                  onAdd={addFriendAction}
                  onRespond={async (id, decision) => {
                    await respondRequestAction(id, decision);
                    await refresh();
                  }}
                  loadRecent={recentFriendsAction}
                  onOpenChat={(h) => {
                    setView("list");
                    void openChat(h);
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
                  onCreateAgent={() => setModal({ mode: "agent-create" })}
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

      {/* AI Agent：创建 / 连接命令 / 人设 */}
      {modal?.mode === "agent-create" && (
        <AgentModal onClose={() => setModal(null)} onCreated={refresh} onOpenChat={openChat} />
      )}
      {modal?.mode === "agent-command" && <ConnectorCommandModal command={modal.command} title={modal.title} onClose={() => setModal(null)} />}
      {modal?.mode === "agent-persona" && (
        <PersonaModal
          name={modal.friend.name}
          initial={modal.friend.persona ?? ""}
          onSave={async (persona) => {
            await updateAgentPersonaAction(modal.friend.handle, persona);
            await refresh();
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
          onAgentGetCommand={async () => {
            const f = menu.friend;
            const res = await getAgentCommandAction(f.handle);
            if (res.ok && res.command) {
              setModal({ mode: "agent-command", command: res.command, title: `${f.name} · 连接 / 重启命令` });
            } else if (res.needsReset) {
              if (window.confirm(`${res.error}。现在重置令牌并生成命令？（旧令牌会失效）`)) {
                const r = await resetAgentTokenAction(f.handle, f.agentKind ?? "local-claude");
                if (r.ok && r.command) setModal({ mode: "agent-command", command: r.command, title: `${f.name} · 连接 / 重启命令` });
              }
            }
          }}
          onAgentReset={async () => {
            const f = menu.friend;
            if (!window.confirm(`重置「${f.name}」的连接令牌？旧令牌（含正在运行的连接器）会立即失效，需用新命令重连。`)) return;
            const res = await resetAgentTokenAction(f.handle, f.agentKind ?? "local-claude");
            if (res.ok && res.command) setModal({ mode: "agent-command", command: res.command, title: `${f.name} · 令牌已重置` });
          }}
          onAgentPersona={() => setModal({ mode: "agent-persona", friend: menu.friend })}
          onAgentDelete={async () => {
            if (window.confirm(`确定删除 Agent「${menu.friend.name}」？聊天记录会一并清除。`)) {
              await deleteAgentAction(menu.friend.handle);
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
  onAgentGetCommand,
  onAgentReset,
  onAgentPersona,
  onAgentDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onMessage: () => void;
  onInviteToGroup: () => void;
  onRemark: () => void;
  onRemove: () => void;
  onAgentGetCommand: () => void;
  onAgentReset: () => void;
  onAgentPersona: () => void;
  onAgentDelete: () => void;
}) {
  const usingApp = state.friend.presence.kind === "using" ? state.friend.presence.appSlug : undefined;
  const items = state.friend.isAgent
    ? [
        { label: "发消息", icon: MessageSquare, run: onMessage },
        { label: "邀请到群组聊天", icon: Users, run: onInviteToGroup },
        { label: "编辑人设", icon: Bot, run: onAgentPersona },
        ...(state.friend.agentKind !== "hosted"
          ? [
              { label: "连接 / 重启命令", icon: Terminal, run: onAgentGetCommand },
              { label: "重置连接令牌", icon: KeyRound, run: onAgentReset },
            ]
          : []),
        { label: "删除 Agent", icon: Trash2, run: onAgentDelete, danger: true },
      ]
    : [
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
