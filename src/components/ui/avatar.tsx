import { Bot } from "lucide-react";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  hue: number;
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

/** 色相头像：名字首字 + 双色相渐变底。Agent 头像带机器人角标。 */
export function Avatar({ name, hue, size = "md", isAgent, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-semibold text-white/90 ring-1 ring-white/15",
          sizes[size],
        )}
        style={{
          background: `linear-gradient(135deg, hsl(${hue} 60% 38%), hsl(${(hue + 60) % 360} 55% 30%))`,
        }}
      >
        {name.slice(0, 1)}
      </span>
      {isAgent && (
        <span className="absolute -right-1 -bottom-1 flex items-center justify-center rounded-full bg-teal p-[3px] text-abyss ring-2 ring-abyss">
          <Bot className="size-2.5" strokeWidth={2.5} />
        </span>
      )}
    </span>
  );
}
