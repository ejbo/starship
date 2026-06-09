import {
  Bot,
  BookOpen,
  Braces,
  Cpu,
  FileSearch,
  Globe,
  GraduationCap,
  LayoutGrid,
  MessagesSquare,
  Mic,
  Presentation,
  Radar,
  Sparkles,
  Telescope,
  Users,
  Video,
  Wand2,
  type LucideIcon,
} from "lucide-react";

/** 产品封装画使用的图标注册表（mock 数据用字符串引用，避免数据层依赖 React） */
export const productIcons: Record<string, LucideIcon> = {
  bot: Bot,
  book: BookOpen,
  braces: Braces,
  cpu: Cpu,
  "file-search": FileSearch,
  globe: Globe,
  graduation: GraduationCap,
  grid: LayoutGrid,
  chat: MessagesSquare,
  mic: Mic,
  presentation: Presentation,
  radar: Radar,
  sparkles: Sparkles,
  telescope: Telescope,
  users: Users,
  video: Video,
  wand: Wand2,
};

export function getProductIcon(name: string): LucideIcon {
  return productIcons[name] ?? Sparkles;
}
