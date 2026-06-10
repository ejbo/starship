import Link from "next/link";
import { Download, Flame, Plus, Radio, Star, Trophy, Users, Wrench } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { TypeBadge } from "@/components/ui/type-badge";
import { getAllProducts, getFeed, getFriends, getLiveRoundtables } from "@/lib/catalog";
import type { ActivityEvent, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const verbMeta: Record<ActivityEvent["verb"], { text: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  acquired: { text: "获取了", icon: Plus, tone: "text-accent" },
  reviewed: { text: "评测了", icon: Star, tone: "text-gold" },
  published: { text: "更新了", icon: Wrench, tone: "text-green" },
  roundtable: { text: "", icon: Users, tone: "text-purple" },
  "installed-skill": { text: "", icon: Trophy, tone: "text-gold" },
};

function FeedCard({ event, product }: { event: ActivityEvent; product?: Product }) {
  const meta = verbMeta[event.verb];
  const Icon = meta.icon;
  return (
    <article className="capsule overflow-hidden">
      {/* 头部：谁、做了什么、何时 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar name={event.actor.name} hue={event.actor.avatarHue} size="md" isAgent={event.actor.isAgent} />
        <div className="min-w-0 grow">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{event.actor.name}</span>{" "}
            {event.detail ? (
              <span className="text-dim">{event.detail}</span>
            ) : (
              <>
                <span className="text-dim">{meta.text}</span>{" "}
                {product && (
                  <Link href={`/p/${product.slug}`} className="font-medium text-accent hover:underline">
                    {product.name}
                  </Link>
                )}
              </>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-mute">
            <Icon className={`size-3 ${meta.tone}`} /> {event.at}
          </p>
        </div>
      </div>
      {/* 媒体：产品大横幅 */}
      {product && (
        <Link href={`/p/${product.slug}`} className="group relative block border-t border-line">
          <CapsuleArt art={product.art} ratio="banner" iconClassName="max-h-16" />
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
            <span className="text-sm font-semibold text-white">{product.name}</span>
            <TypeBadge type={product.type} className="bg-white/85" />
            <span className="ml-auto flex items-center gap-1 text-xs text-white/80">
              <Download className="size-3" /> {product.acquisitions.toLocaleString("zh-CN")}
            </span>
          </div>
        </Link>
      )}
      {/* 互动条 */}
      <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-mute">
        <button className="transition-colors hover:text-accent">赞</button>
        <button className="transition-colors hover:text-accent">评论</button>
        <button className="ml-auto transition-colors hover:text-accent">分享</button>
      </div>
    </article>
  );
}

export default async function CommunityPage() {
  const [feed, allProducts, friends] = await Promise.all([getFeed(), getAllProducts(), getFriends()]);
  const roundtables = getLiveRoundtables();
  const productBySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const trending = [...allProducts].sort((a, b) => b.acquisitions - a.acquisitions).slice(0, 5);
  const onlineFriends = friends.filter((f) => f.presence.kind !== "offline");

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">动态</h1>
        <span className="text-sm text-dim">好友与关注对象的最新动向</span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {feed.map((event) => (
            <FeedCard key={event.id} event={event} product={event.productSlug ? productBySlug.get(event.productSlug) : undefined} />
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          {/* 在线好友 */}
          {friends.length > 0 && (
            <div className="capsule p-5">
              <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
                好友在线 <span className="text-xs font-normal text-mute">{onlineFriends.length}</span>
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {(onlineFriends.length ? onlineFriends : friends).slice(0, 10).map((f) => {
                  const dot = f.presence.kind === "using" || f.presence.kind === "meeting" ? "bg-green" : f.presence.kind === "online" ? "bg-accent" : "bg-mute";
                  return (
                    <Link key={f.handle} href={`/u/${f.handle}`} title={`${f.remark || f.name} · ${f.presence.detail ?? f.presence.kind}`} className="relative">
                      <Avatar name={f.remark || f.name} hue={f.avatarHue} src={f.avatarUrl} size="md" className={f.presence.kind === "offline" ? "opacity-50" : undefined} />
                      <span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel ${dot}`} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 热门造物 */}
          <div className="capsule p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Flame className="size-4 text-[#e3884f]" /> 热门造物
            </h3>
            <ul className="space-y-2.5">
              {trending.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/p/${p.slug}`} className="group flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-center text-sm font-semibold text-mute">{i + 1}</span>
                    <CapsuleArt art={p.art} ratio="square" className="w-9 shrink-0 rounded ring-1 ring-line" iconClassName="size-1/2" />
                    <span className="min-w-0 grow">
                      <span className="block truncate text-sm font-medium transition-colors group-hover:text-accent">{p.name}</span>
                      <span className="block text-[11px] text-mute">{p.acquisitions.toLocaleString("zh-CN")} 获取</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 进行中的圆桌 */}
          <div className="capsule p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Radio className="size-4 text-danger" /> 进行中的圆桌
            </h3>
            <div className="space-y-4">
              {roundtables.map((rt) => (
                <div key={rt.id} className="rounded-lg border border-line bg-page p-3.5">
                  <p className="text-sm font-medium leading-snug">{rt.topic}</p>
                  <p className="mt-1 text-xs text-mute">主持：{rt.host}</p>
                  <div className="mt-2.5 flex items-center">
                    {rt.seats.map((seat, i) => (
                      <Avatar key={seat.name} name={seat.name} hue={seat.avatarHue} size="sm" isAgent={seat.isAgent} className={i > 0 ? "-ml-1.5" : undefined} />
                    ))}
                    <span className="ml-2.5 flex items-center gap-1 text-xs text-mute">
                      <Users className="size-3" /> {rt.listeners} 人旁听
                    </span>
                  </div>
                  <button disabled className="mt-3 w-full cursor-not-allowed rounded-md border border-line py-1.5 text-xs text-mute" title="圆桌功能即将开放">
                    旁听 · 即将开放
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
