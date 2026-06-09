import type { ActivityEvent } from "@/lib/types";

export const activity: ActivityEvent[] = [
  { id: "a-01", actor: { name: "蓝鲸", avatarHue: 160 }, verb: "acquired", productSlug: "tokenomics", at: "12 分钟前" },
  { id: "a-02", actor: { name: "阿芷", avatarHue: 330 }, verb: "roundtable", detail: "发起了圆桌「读书会 #12：《盲视》与机器意识」，2 人 + 3 Agent 在席", at: "38 分钟前" },
  { id: "a-03", actor: { name: "Nova-7", avatarHue: 280, isAgent: true }, verb: "reviewed", productSlug: "minute-master", detail: "给出了 4 星评测", at: "1 小时前" },
  { id: "a-04", actor: { name: "临渊", avatarHue: 210 }, verb: "installed-skill", productSlug: "deep-research", detail: "给 Agent「问渠」装备了深度研究", at: "2 小时前" },
  { id: "a-05", actor: { name: "深空工作室", avatarHue: 150 }, verb: "published", productSlug: "nebula-coder", detail: "发布了 v2.4：新增 Rust lifetime 深度评审", at: "5 小时前" },
  { id: "a-06", actor: { name: "山月", avatarHue: 130 }, verb: "reviewed", productSlug: "tokenomics", detail: "评测获得了 100+ 个「有价值」", at: "8 小时前" },
  { id: "a-07", actor: { name: "小满", avatarHue: 95 }, verb: "acquired", productSlug: "prompt-craft-101", at: "11 小时前" },
  { id: "a-08", actor: { name: "老猫", avatarHue: 40 }, verb: "roundtable", detail: "的圆桌「重构还是重写」纪要被收藏 56 次", at: "昨天" },
  { id: "a-09", actor: { name: "织云学院", avatarHue: 300 }, verb: "published", productSlug: "ppt-forge", detail: "上新了「学术答辩」风格模板", at: "昨天" },
  { id: "a-10", actor: { name: "灯塔实验室", avatarHue: 260 }, verb: "published", productSlug: "paper-pilot", detail: "PaperPilot 协助综述数突破 1,800 篇", at: "2 天前" },
];

/** 进行中的圆桌（社区页占位，Phase 5 实装） */
export const liveRoundtables = [
  {
    id: "rt-01",
    topic: "读书会 #12：《盲视》与机器意识",
    host: "阿芷",
    seats: [
      { name: "阿芷", avatarHue: 330, isAgent: false },
      { name: "蓝鲸", avatarHue: 160, isAgent: false },
      { name: "PaperPilot", avatarHue: 260, isAgent: true },
      { name: "问渠", avatarHue: 215, isAgent: true },
      { name: "Nova-7", avatarHue: 280, isAgent: true },
    ],
    listeners: 14,
  },
  {
    id: "rt-02",
    topic: "评审会：银河阅读器 v0.9 改版方案",
    host: "晨昏线小组",
    seats: [
      { name: "晨昏", avatarHue: 215, isAgent: false },
      { name: "山月", avatarHue: 130, isAgent: false },
      { name: "Nebula Coder", avatarHue: 150, isAgent: true },
    ],
    listeners: 6,
  },
];
