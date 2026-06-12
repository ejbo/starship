import type { MessageKind } from "@/lib/message-service";
import type { Friend, PresenceKind } from "@/lib/types";

/** 状态点颜色 / 文案 / 文字色（Steam：游戏中绿、在线蓝、离线灰） */
export const presenceMeta: Record<PresenceKind, { dot: string; text: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", text: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", text: (d) => (d ? `${d}` : "正在使用"), tone: "text-green" },
  meeting: { dot: "bg-purple", text: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", text: () => "离线", tone: "text-mute" },
};

/** 紧凑处（tab/头像/占位符）的称呼：备注优先；列表行则用「昵称（备注）」双显，Steam 同款 */
export const display = (f: Friend) => f.remark || f.name;

/** "5 分钟前 / 3 小时前 / 2 天前" */
export function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const mins = Math.max(1, Math.floor(ms / 60_000));
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}

/** 状态行文案：离线好友显示「最后在线 X 前」 */
export function statusText(f: Friend): string {
  if (f.presence.kind === "offline") {
    return f.lastSeenAt ? `最后在线 ${timeAgo(f.lastSeenAt)}` : "离线";
  }
  return presenceMeta[f.presence.kind].text(f.presence.detail);
}

/** Steam 等级环颜色（按段位换色） */
export function levelRingColor(level: number): string {
  if (level >= 40) return "#d97a1e";
  if (level >= 30) return "#7c5cd6";
  if (level >= 20) return "#2563eb";
  if (level >= 10) return "#1f9d55";
  return "#98a1b3";
}

/** banner 是否为视频（mp4/webm 直链或 data:video） */
export function isVideoBanner(url: string): boolean {
  return /^data:video\//.test(url) || /\.(mp4|webm)(\?|#|$)/i.test(url);
}

// —— 消息时间 ——

export const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 日期分隔条："2026年5月30日 星期六"（今天/昨天友好化） */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const s = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((s(now) - s(d)) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "昨天";
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

/** 消息组头时间："2026/5/30 12:34"（当天仅时间） */
export function messageTimeLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return timeLabel(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${timeLabel(iso)}`;
}

// —— 统一消息视图（私聊与群聊共用渲染） ——

export interface MsgSender {
  handle: string;
  name: string;
  avatarHue: number;
  avatarUrl?: string | null;
}

export interface ViewMessage {
  id: string;
  kind: MessageKind;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  at: string;
  sender: MsgSender;
}

export interface Conversation {
  messages: ViewMessage[];
  hasMore: boolean;
  /** 首页是否已从服务端取回（区分「加载中」与「确实没有消息」） */
  loaded?: boolean;
}

export interface MessageDayBucket {
  day: string;
  groups: { sender: MsgSender; start: string; items: ViewMessage[]; markerBefore: boolean }[];
}

const GROUP_GAP_MS = 10 * 60 * 1000; // 同发送者间隔超 10 分钟另起一组（时间戳不误导）

/** 按天 → 连续同发送者分组；markerId 处强制断组（未读分隔线插在组前） */
export function groupByDayAndSender(messages: ViewMessage[], markerId?: string | null): MessageDayBucket[] {
  const days: MessageDayBucket[] = [];
  for (const m of messages) {
    const day = dayLabel(m.at);
    let bucket = days[days.length - 1];
    if (!bucket || bucket.day !== day) {
      bucket = { day, groups: [] };
      days.push(bucket);
    }
    const isMarker = !!markerId && m.id === markerId;
    const last = bucket.groups[bucket.groups.length - 1];
    const lastAt = last ? Date.parse(last.items[last.items.length - 1].at) : 0;
    const sameRun = !!last && last.sender.handle === m.sender.handle && Date.parse(m.at) - lastAt < GROUP_GAP_MS;
    if (sameRun && !isMarker) last!.items.push(m);
    else bucket.groups.push({ sender: m.sender, start: m.at, items: [m], markerBefore: isMarker });
  }
  return days;
}

// 按 grapheme 切分（/./gu 会把「❤️」的 VS16 拆成不可见独立项）
export const EMOJIS = [...new Intl.Segmenter().segment("😀😄😁😆😉😊🙂😍😘😎🤔😐😴😭😡👍👎👌🙏👏💪🎉🔥✨💯❤️💔⭐🌟✅❌❓💡📌🚀☕🍻🐶🐱")].map((s) => s.segment);

/** 把图片压缩成较小的 JPEG dataURL */
export function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("无法处理图片"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}
