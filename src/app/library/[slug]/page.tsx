import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Clock, History, Tag } from "lucide-react";
import { AchievementList } from "@/components/product/achievement-list";
import { FriendsWhoPlay } from "@/components/library/friends-who-play";
import { LibraryLaunchButton } from "@/components/library/library-launch-button";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { getAchievementsForUser } from "@/lib/achievement-service";
import { describeCapability, getBySlug } from "@/lib/catalog";
import { getFriendsWithProduct } from "@/lib/friends-service";
import { getMyLibraryStat, isInLibrary } from "@/lib/library-service";
import { formatPlaytime } from "@/lib/playtime";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 库详情页（Steam 式）：应用信息 + 启动 + 版本 + 在玩的好友 + 成就。 */
export default async function LibraryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const userId = await getSessionUserIdOrNull();
  if (!userId) redirect("/login");

  const product = await getBySlug(slug);
  if (!product) notFound();
  // 未拥有 → 回商店详情页（库详情仅对已入库的应用开放）
  if (!(await isInLibrary(slug))) redirect(`/p/${slug}`);

  const [stat, achievements, friendsPlay] = await Promise.all([
    getMyLibraryStat(product.id),
    getAchievementsForUser(product.id, userId),
    getFriendsWithProduct(product.id),
  ]);

  const launchMode = product.entry?.launchMode === "newtab" ? "newtab" : "embedded";

  return (
    <main className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6">
      <Link href="/library" className="mb-3 inline-flex items-center gap-1 text-xs text-dim transition-colors hover:text-accent">
        <ChevronLeft className="size-3.5" /> 返回库
      </Link>

      {/* Hero banner + 名称 */}
      <div className="relative overflow-hidden rounded-xl shadow-sm">
        <CapsuleArt art={product.art} ratio="banner" className="h-52 w-full sm:h-72" iconClassName="max-h-24" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1020]/85 via-[#0b1020]/20 to-transparent" />
        <div className="absolute bottom-0 left-0 flex flex-col gap-1 p-5 text-white sm:p-6">
          <span className="text-xs text-white/75">{product.developer}{product.version ? ` · v${product.version}` : ""}</span>
          <h1 className="font-display text-3xl font-black tracking-tight drop-shadow sm:text-4xl">{product.name}</h1>
        </div>
      </div>

      {/* 操作条：启动 + 统计 + 能力 */}
      <div className="capsule mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 p-4 sm:p-5">
        {product.entry ? (
          <LibraryLaunchButton slug={product.slug} launchMode={launchMode} />
        ) : (
          <Link href={`/p/${product.slug}`} className="rounded-md border border-line px-6 py-2.5 text-sm font-medium text-dim hover:text-accent">
            查看详情
          </Link>
        )}

        <Stat icon={History} label="最近使用" value={stat?.lastUsedAt ?? "—"} />
        <Stat icon={Clock} label="累计时长" value={formatPlaytime(stat?.usageMinutes ?? 0)} />
        <Stat icon={Tag} label="当前版本" value={product.version ? `v${product.version}` : "—"} />

        {product.capabilities.length > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {product.capabilities.map((cap) => (
              <span key={cap} className="rounded border border-line bg-page px-1.5 py-0.5 text-[11px] text-mute">
                {describeCapability(cap).name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 主体两栏 */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* 版本 / 更新 */}
          <section className="capsule p-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <History className="size-4" /> 版本与更新
            </h2>
            <p className="text-sm text-dim">
              当前版本 <span className="font-medium text-ink">{product.version ? `v${product.version}` : "—"}</span>
              <span className="text-mute"> · 更新于 {product.updatedAt} · 发布于 {product.releasedAt}</span>
            </p>
            {product.description[0] && <p className="mt-2 text-sm leading-relaxed text-ink/90">{product.description[0]}</p>}
          </section>

          {/* 成就 */}
          {achievements.length > 0 && <div className="capsule p-5"><AchievementList achievements={achievements} /></div>}
        </div>

        {/* 右栏：在玩的好友 */}
        <FriendsWhoPlay slug={product.slug} friends={friendsPlay} />
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-mute" />
      <div className="leading-tight">
        <p className="text-[11px] text-mute">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
