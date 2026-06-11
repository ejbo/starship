import Link from "next/link";
import { Flame, Radio, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { CommunityFeed } from "@/components/community/community-feed";
import { getAllProducts, getFeed, getFriends, getLiveRoundtables } from "@/lib/catalog";
import type { Friend } from "@/lib/types";

export const dynamic = "force-dynamic";

function presenceLabel(p: Friend["presence"]): string {
  if (p.kind === "using") return p.detail ? `正在使用 ${p.detail}` : "使用中";
  if (p.kind === "meeting") return p.detail ? `会议中 · ${p.detail}` : "会议中";
  if (p.kind === "online") return "在线";
  return "离线";
}

const dotClass: Record<string, string> = {
  using: "bg-green",
  meeting: "bg-green",
  online: "bg-accent",
  offline: "bg-mute",
};

export default async function CommunityPage() {
  const [feed, allProducts, friends] = await Promise.all([getFeed(), getAllProducts(), getFriends()]);
  const roundtables = getLiveRoundtables();
  const productBySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const trending = [...allProducts].sort((a, b) => b.acquisitions - a.acquisitions).slice(0, 5);
  const online = friends.filter((f) => f.presence.kind !== "offline");
  const items = feed.map((event) => ({ event, product: event.productSlug ? productBySlug.get(event.productSlug) : undefined }));

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">动态</h1>
        <span className="text-sm text-dim">好友与关注对象的最新动向</span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <CommunityFeed items={items} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          {/* 好友在线（含富状态） */}
          {friends.length > 0 && (
            <div className="capsule p-5">
              <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
                好友在线 <span className="text-xs font-normal text-mute">{online.length}/{friends.length}</span>
              </h3>
              <ul className="space-y-2.5">
                {(online.length ? online : friends).slice(0, 8).map((f) => (
                  <li key={f.handle}>
                    <Link href={`/u/${f.handle}`} className="group flex items-center gap-2.5">
                      <span className="relative shrink-0">
                        <Avatar
                          name={f.remark || f.name}
                          hue={f.avatarHue}
                          src={f.avatarUrl}
                          size="md"
                          className={f.presence.kind === "offline" ? "opacity-50" : undefined}
                        />
                        <span className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel ${dotClass[f.presence.kind] ?? "bg-mute"}`} />
                      </span>
                      <span className="min-w-0 grow">
                        <span className="block truncate text-sm font-medium transition-colors group-hover:text-accent">{f.remark || f.name}</span>
                        <span className={`block truncate text-[11px] ${f.presence.kind === "using" || f.presence.kind === "meeting" ? "text-green" : "text-mute"}`}>
                          {presenceLabel(f.presence)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
