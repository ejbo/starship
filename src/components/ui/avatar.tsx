import { Bot } from "lucide-react";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  hue: number;
  /** 上传头像 URL；存在则显示图片，否则用色相首字 */
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isAgent?: boolean;
  className?: string;
}

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[11px]",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
  xl: "size-20 text-2xl",
} as const;

/** 头像：上传图片优先，否则色相首字。Agent 头像带机器人角标。 */
export function Avatar({ name, hue, src, size = "md", isAgent, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn("rounded-full object-cover", sizes[size])}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full font-medium text-white",
            sizes[size],
          )}
          style={{ background: `hsl(${hue} 45% 50%)` }}
        >
          {name.slice(0, 1)}
        </span>
      )}
      {isAgent && (
        <span className="absolute -right-1 -bottom-1 flex items-center justify-center rounded-full bg-green p-[3px] text-white ring-2 ring-panel">
          <Bot className="size-2.5" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}
