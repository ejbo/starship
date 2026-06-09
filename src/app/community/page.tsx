import Link from "next/link";
import { Radio, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { getAllProducts, getFeed, getLiveRoundtables } from "@/lib/catalog";
import type { ActivityEvent, Product } from "@/lib/types";

const verbText: Record<ActivityEvent["verb"], string> = {
  acquired: "获取了",
  reviewed: "评测了",
  published: "更新了",
  roundtable: "",
  "installed-skill": "",
};

function FeedCard({ event, product }: { event: ActivityEvent; product?: Product }) {
  return (
    <article className="capsule flex items-center gap-3.5 p-4">
      <Avatar name={event.actor.name} hue={event.actor.avatarHue} size="md" isAgent={event.actor.isAgent} />
      <div className="min-w-0 grow">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{event.actor.name}</span>{" "}
          {event.detail ? (
            <span className="text-dim">{event.detail}</span>
          ) : (
            <>
              <span className="text-dim">{verbText[event.verb]}</span>{" "}
              {product && (
                <Link href={`/p/${product.slug}`} className="font-medium text-accent hover:underline">
                  {product.name}
                </Link>
              )}
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-mute">{event.at}</p>
      </div>
      {product && (
        <Link href={`/p/${product.slug}`} className="hidden shrink-0 sm:block">
          <CapsuleArt
            art={product.art}
            ratio="wide"
            className="w-24 rounded-md ring-1 ring-line transition-all hover:ring-accent/50"
            iconClassName="size-1/3"
          />
        </Link>
      )}
    </article>
  );
}

export default async function CommunityPage() {
  const [feed, allProducts] = await Promise.all([getFeed(), getAllProducts()]);
  const roundtables = getLiveRoundtables();
  const productBySlug = new Map(allProducts.map((p) => [p.slug, p]));

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">动态</h1>
        <span className="text-sm text-dim">好友与关注对象的最新动向</span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-3">
          {feed.map((event) => (
            <FeedCard
              key={event.id}
              event={event}
              product={event.productSlug ? productBySlug.get(event.productSlug) : undefined}
            />
          ))}
        </div>

        {/* 进行中的圆桌（Phase 5 实装） */}
        <aside className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <div className="capsule p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Radio className="size-4 text-danger" />
              进行中的圆桌
            </h3>
            <div className="space-y-4">
              {roundtables.map((rt) => (
                <div key={rt.id} className="rounded-md border border-line bg-page p-3.5">
                  <p className="text-sm font-medium leading-snug">{rt.topic}</p>
                  <p className="mt-1 text-xs text-mute">主持：{rt.host}</p>
                  <div className="mt-2.5 flex items-center">
                    {rt.seats.map((seat, i) => (
                      <Avatar
                        key={seat.name}
                        name={seat.name}
                        hue={seat.avatarHue}
                        size="sm"
                        isAgent={seat.isAgent}
                        className={i > 0 ? "-ml-1.5" : undefined}
                      />
                    ))}
                    <span className="ml-2.5 flex items-center gap-1 text-xs text-mute">
                      <Users className="size-3" /> {rt.listeners} 人旁听
                    </span>
                  </div>
                  <button
                    disabled
                    title="圆桌功能于 Phase 5 开放"
                    className="mt-3 w-full cursor-not-allowed rounded-md border border-line py-1.5 text-xs text-mute"
                  >
                    旁听 · 即将开放
                  </button>
                </div>
              ))}
            </div>
          </div>
          <p className="px-1 text-xs leading-relaxed text-mute">
            圆桌：带上你的 Agent 与好友同桌讨论，会后自动生成纪要。
          </p>
        </aside>
      </div>
    </main>
  );
}
