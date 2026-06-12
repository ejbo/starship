import type { CurrentUser, Friend } from "@/lib/types";

export const currentUser: CurrentUser = {
  handle: "me",
  name: "织星者",
  avatarHue: 205,
  level: 23,
  signature: "加入星港第 142 天，正在驯养第三个 Agent。",
  badges: [
    { label: "早期用户", icon: "sparkles" },
    { label: "圆桌主持人", icon: "users" },
    { label: "提示词工匠", icon: "graduation" },
    { label: "评测家 Lv.3", icon: "book" },
  ],
  showcase: ["multillm-chat", "roundtable", "paper-pilot", "prompt-craft-101"],
  library: [
    { slug: "multillm-chat", acquiredAt: "2026-01-19", lastUsedAt: "2026-06-09", usageHours: 312 },
    { slug: "roundtable", acquiredAt: "2026-03-02", lastUsedAt: "2026-06-08", usageHours: 87 },
    { slug: "claude-fable-5", acquiredAt: "2026-02-24", lastUsedAt: "2026-06-09", usageHours: 540 },
    { slug: "paper-pilot", acquiredAt: "2026-03-12", lastUsedAt: "2026-06-07", usageHours: 110 },
    { slug: "deep-research", acquiredAt: "2026-04-03", lastUsedAt: "2026-06-05", usageHours: 66 },
    { slug: "tokenomics", acquiredAt: "2026-04-21", lastUsedAt: "2026-06-06", usageHours: 16 },
    { slug: "prompt-craft-101", acquiredAt: "2026-02-11", lastUsedAt: "2026-04-02", usageHours: 14 },
    { slug: "galaxy-reader", acquiredAt: "2026-05-01", lastUsedAt: "2026-06-04", usageHours: 52 },
    { slug: "agent-arena-finals", acquiredAt: "2026-05-10", lastUsedAt: "2026-05-12", usageHours: 3 },
  ],
  tokenBalance: "1.2M",
};

export const friends: Friend[] = [
  { handle: "linyuan", name: "临渊", avatarHue: 210, level: 31, presence: { kind: "online" } },
  { handle: "bluewhale", name: "蓝鲸", avatarHue: 160, level: 27, presence: { kind: "using", detail: "MultiLLM Chat" } },
  { handle: "azhi", name: "阿芷", avatarHue: 330, level: 19, presence: { kind: "meeting", detail: "圆桌：读书会 #12" } },
  { handle: "oldcat", name: "老猫", avatarHue: 40, level: 35, presence: { kind: "offline" } },
  { handle: "xiaoman", name: "小满", avatarHue: 95, level: 12, presence: { kind: "using", detail: "银河阅读器" } },
  { handle: "shanyue", name: "山月", avatarHue: 130, level: 28, presence: { kind: "online" } },
  { handle: "chenzhou", name: "沉舟", avatarHue: 260, level: 22, presence: { kind: "offline" } },
  { handle: "qingteng", name: "青藤", avatarHue: 70, level: 8, presence: { kind: "offline" } },
];

/** 留言板（个人主页静态展示） */
export const wallPosts = [
  { author: "阿芷", avatarHue: 330, body: "上次圆桌你的 Agent 抢答太快了，下次让它礼让三秒（笑）", date: "2026-06-07" },
  { author: "临渊", avatarHue: 210, body: "+1 你评测里说的分栏技巧，亲测好用", date: "2026-06-03" },
  { author: "蓝鲸", avatarHue: 160, body: "周五圆桌见，我带新驯的纪要 Agent", date: "2026-05-30" },
];
