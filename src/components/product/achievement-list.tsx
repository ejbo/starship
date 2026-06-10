import { Lock } from "lucide-react";
import { getProductIcon } from "@/lib/icons";
import type { AchievementView } from "@/lib/achievement-service";
import { cn } from "@/lib/cn";

/** 详情页成就列表：含全站稀有度（Steam 式） */
export function AchievementList({ achievements }: { achievements: AchievementView[] }) {
  if (achievements.length === 0) return null;
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold">成就</h2>
        <span className="text-sm text-dim">
          {unlocked}/{achievements.length} 已解锁
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {achievements.map((a) => {
          const Icon = getProductIcon(a.icon);
          return (
            <div
              key={a.key}
              className={cn(
                "capsule flex items-center gap-3 p-3.5",
                !a.unlocked && "opacity-70",
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  a.unlocked ? "bg-gold/12 text-gold" : "bg-card-hi text-mute",
                )}
              >
                {a.unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="truncate text-xs text-mute">{a.description}</p>
              </div>
              <span className="ml-auto shrink-0 text-right">
                <span className="block text-xs font-medium text-dim">{a.rarity}%</span>
                <span className="block text-[10px] text-mute">玩家解锁</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
