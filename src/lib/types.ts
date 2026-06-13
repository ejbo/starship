export type ProductType = "app" | "model" | "agent" | "skill" | "tutorial" | "video";

/** 程序化封装画参数：两个色相 + 图标名（见 lib/icons.ts 注册表） */
export interface ProductArt {
  hueA: number;
  hueB: number;
  icon: string;
  /** 真实媒体（有则优先于渐变色块）：方形封面 / 宽幅 banner / 截图集 */
  capsuleUrl?: string;
  bannerUrl?: string;
  screenshots?: string[];
}

export interface Review {
  id?: string;
  author: string;
  avatarHue: number;
  isAgent?: boolean;
  score: 1 | 2 | 3 | 4 | 5;
  /** 使用时长（小时），评测可信度的展示来源 */
  usageHours: number;
  helpful: number;
  body: string;
  date: string;
}

export interface Product {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  tagline: string;
  /** 段落数组 */
  description: string[];
  art: ProductArt;
  tags: string[];
  rating: {
    score: number;
    count: number;
    /** 近 10 期好评率（0-100），评测直方图数据 */
    histogram: number[];
  };
  acquisitions: number;
  /** 发布者（应用均为独立开发部署后发布到平台，平台仓库不含应用代码） */
  developer: string;
  /** 当前上架版本（app 类型必填） */
  version?: string;
  /** 应用入口：平台沙箱加载的外部部署地址 */
  entry?: { kind: "sandbox"; url: string; launchMode?: "embedded" | "newtab" };
  /** credits=折后实付价；original/discountPct 存在表示限时折扣 */
  price: "free" | { credits: number; original?: number; discountPct?: number };
  /** 预告视频地址（详情页播放器用） */
  trailerUrl?: string;
  /** 运行环境声明，如 llm:claude / storage:1gb / social:friends */
  capabilities: string[];
  releasedAt: string;
  updatedAt: string;
  featured?: boolean;
  reviews: Review[];
}

export type PresenceKind = "online" | "using" | "meeting" | "offline";

/** 正在使用的应用图标（好友列表行首小图标） */
export interface AppIconArt {
  capsuleUrl: string | null;
  hueA: number;
  hueB: number;
  icon: string;
}

export interface Friend {
  handle: string;
  name: string;
  /** 我给该好友起的备注（仅自己可见），列表里以「名字（备注）」展示 */
  remark?: string | null;
  avatarHue: number;
  avatarUrl?: string | null;
  level: number;
  /** 最近在线时间（ISO）；离线好友展示「最后在线 X 前」 */
  lastSeenAt?: string | null;
  /** 资料背景（悬停卡）：图片/GIF dataURL 或图片/mp4/webm 直链 */
  bannerUrl?: string | null;
  /** 展示徽章（悬停卡），取用户徽章第一枚 */
  badge?: { label: string; icon: string } | null;
  /** AI Agent 虚拟用户（好友面板单独 tab、消息按 markdown 渲染） */
  isAgent?: boolean;
  /** hosted（平台托管）| local-claude | local-codex */
  agentKind?: string | null;
  /** agent 人设（编辑人设弹窗回显） */
  persona?: string | null;
  presence: { kind: PresenceKind; detail?: string; appSlug?: string; appIcon?: AppIconArt | null };
}

export interface CurrentUser {
  handle: string;
  name: string;
  avatarHue: number;
  level: number;
  signature: string;
  badges: { label: string; icon: string }[];
  /** 展柜里精选的产品 slug */
  showcase: string[];
  /** 库里的产品 slug + 元数据 */
  library: { slug: string; acquiredAt: string; lastUsedAt?: string; usageHours: number }[];
  tokenBalance: string;
}

export type ActivityVerb = "acquired" | "reviewed" | "published" | "roundtable" | "installed-skill";

export interface ActivityEvent {
  id: string;
  actor: { name: string; avatarHue: number; isAgent?: boolean };
  verb: ActivityVerb;
  productSlug?: string;
  detail?: string;
  at: string;
}
