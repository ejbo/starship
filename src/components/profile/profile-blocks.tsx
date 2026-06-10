import Link from "next/link";
import { Lock, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { TypeBadge } from "@/components/ui/type-badge";
import { getProductIcon } from "@/lib/icons";
import type { ShowcaseAchievement } from "@/lib/achievement-service";
import type { Friend } from "@/lib/types";
import type { Product } from "@/lib/types";

/** Steam 式圆环等级徽章（带 XP 进度弧） */
export function LevelBadge({ level }: { level: number }) {
  const pct = ((level * 17) % 100) / 100; // 由等级稳定派生的进度（演示）
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="4" className="stroke-line" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[8px] text-mute">等级</span>
        <span className="mt-0.5 text-lg font-bold">{level}</span>
      </span>
    </div>
  );
}

/** 收藏展柜：精选产品的大封面（仿 Steam「最喜爱的游戏」展柜） */
export function FavoriteShowcase({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  const [hero, ...rest] = products;
  return (
    <section className="capsule overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <h3 className="text-sm font-semibold">收藏展柜</h3>
        <p className="text-[11px] text-mute">最喜爱的造物</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-[1.6fr_1fr]">
        <Link href={`/p/${hero.slug}`} className="group block overflow-hidden rounded-lg ring-1 ring-line">
          <CapsuleArt art={hero.art} ratio="wide" iconClassName="max-h-16" />
          <div className="flex items-center gap-2 p-3">
            <span className="grow truncate text-sm font-semibold transition-colors group-hover:text-accent">{hero.name}</span>
            <TypeBadge type={hero.type} />
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          {rest.slice(0, 3).map((p) => (
            <Link key={p.id} href={`/p/${p.slug}`} className="group flex items-center gap-2.5 overflow-hidden rounded-lg ring-1 ring-line transition-colors hover:ring-accent/40">
              <CapsuleArt art={p.art} ratio="square" className="w-12 shrink-0" iconClassName="size-1/2" />
              <span className="min-w-0 grow truncate pr-2 text-xs font-medium transition-colors group-hover:text-accent">{p.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 成就展柜：最稀有的解锁成就 + 全站稀有度（仿 Steam 成就展柜） */
export function AchievementShowcase({ achievements, total }: { achievements: ShowcaseAchievement[]; total: number }) {
  return (
    <section className="capsule overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Trophy className="size-4 text-gold" /> 成就展柜
          </h3>
          <p className="text-[11px] text-mute">共解锁 {total} 个 · 最稀有的在前</p>
        </div>
      </div>
      {achievements.length === 0 ? (
        <p className="p-5 text-sm text-dim">还没有解锁成就。</p>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((a, i) => {
            const Icon = getProductIcon(a.icon);
            return (
              <Link key={i} href={`/p/${a.productSlug}`} className="group flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-gold/40">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-gold">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{a.name}</span>
                  <span className="block truncate text-[11px] text-mute">{a.productName}</span>
                  <span className="mt-0.5 inline-block rounded bg-card-hi px-1.5 py-0.5 text-[10px] text-dim">{a.rarity}% 玩家解锁</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** 好友小网格（仿 Steam 主页好友块） */
export function FriendsMini({ friends }: { friends: Friend[] }) {
  const online = friends.filter((f) => f.presence.kind !== "offline").length;
  return (
    <div className="capsule p-5">
      <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
        好友 <span className="text-xs font-normal text-mute">{online}/{friends.length} 在线</span>
      </h3>
      {friends.length === 0 ? (
        <p className="text-sm text-dim">还没有好友。</p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {friends.slice(0, 15).map((f) => {
            const offline = f.presence.kind === "offline";
            const dot = f.presence.kind === "using" || f.presence.kind === "meeting" ? "bg-green" : f.presence.kind === "online" ? "bg-accent" : "bg-mute";
            return (
              <Link key={f.handle} href={`/u/${f.handle}`} title={f.remark || f.name} className="group relative">
                <Avatar name={f.remark || f.name} hue={f.avatarHue} src={f.avatarUrl} size="md" className={offline ? "opacity-50" : undefined} />
                <span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel ${dot}`} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 锁定占位成就（公开主页展示用，凑数美观） */
export function LockedAchievementHint() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card-hi text-mute">
      <Lock className="size-4" />
    </span>
  );
}
