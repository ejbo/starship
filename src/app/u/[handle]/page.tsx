import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, LayoutGrid, LogOut, MessageSquare, Pencil, Trophy, UserPlus } from "lucide-react";
import {
  AchievementShowcase,
  FavoriteShowcase,
  FriendsMini,
  LevelBadge,
} from "@/components/profile/profile-blocks";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { formatPlaytime, formatPlaytimeShort } from "@/lib/playtime";
import { getBySlug, getCurrentUser, getFriends, getWallPosts } from "@/lib/catalog";
import { countUserUnlocks, getUserAchievementShowcase } from "@/lib/achievement-service";
import { getEditableProfile, getPublicProfile, type PublicProfile } from "@/lib/profile-service";
import { getSessionUserId } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

const BANNER = "bg-[radial-gradient(900px_240px_at_15%_120%,#cfe0f6,transparent),radial-gradient(900px_240px_at_85%_-20%,#e4dcf8,transparent),linear-gradient(120deg,#dde7f5,#e9eef7)]";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  if (handle !== "me") {
    const pub = await getPublicProfile(handle);
    if (!pub) notFound();
    return <PublicProfileView profile={pub} />;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const meId = await getSessionUserId();
  const [friends, editable, achievements, unlockCount] = await Promise.all([
    getFriends(),
    getEditableProfile(),
    getUserAchievementShowcase(meId, 6),
    countUserUnlocks(meId),
  ]);
  const wallPosts = getWallPosts();
  const showcaseProducts = (await Promise.all(user.showcase.map((slug) => getBySlug(slug)))).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  const totalMinutes = user.library.reduce((sum, e) => sum + e.usageMinutes, 0);
  const recentEntries = [...user.library]
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
    .slice(0, 4);
  const recentProducts = await Promise.all(recentEntries.map((e) => getBySlug(e.slug)));
  const recentlyUsed = recentEntries.map((entry, i) => ({ entry, product: recentProducts[i] }));

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <ProfileHeader
        name={user.name}
        avatarHue={user.avatarHue}
        avatarUrl={user.avatarUrl}
        level={user.level}
        handle={editable.handle}
        friendCode={editable.friendCode}
        signature={user.signature}
        badges={user.badges}
        online
        actions={
          <>
            <Link href="/settings/profile" className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-accent/40 hover:text-accent">
              <Pencil className="size-3.5" /> 编辑资料
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-danger/40 hover:text-danger">
                <LogOut className="size-3.5" /> 登出
              </button>
            </form>
          </>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <FavoriteShowcase products={showcaseProducts} />
          <AchievementShowcase achievements={achievements} total={unlockCount} />

          <div className="capsule p-5">
            <h3 className="mb-3 text-sm font-semibold">最近动态</h3>
            <ul className="space-y-3">
              {recentlyUsed.map(({ entry, product }) =>
                product ? (
                  <li key={entry.slug} className="flex items-center gap-3">
                    <Link href={`/p/${product.slug}`} className="shrink-0">
                      <span className="block w-16 overflow-hidden rounded ring-1 ring-line">
                        <ProductMini slug={product.slug} hueA={product.art.hueA} hueB={product.art.hueB} icon={product.art.icon} />
                      </span>
                    </Link>
                    <div className="min-w-0 grow">
                      <p className="truncate text-sm">
                        使用了 <Link href={`/p/${product.slug}`} className="font-medium text-ink hover:text-accent">{product.name}</Link>
                      </p>
                      <p className="text-xs text-mute">最近 {entry.lastUsedAt}</p>
                    </div>
                    <span className="shrink-0 text-xs text-mute">{formatPlaytimeShort(entry.usageMinutes)}</span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <StatGrid
            stats={[
              { icon: LayoutGrid, label: "库中产品", value: String(user.library.length) },
              { icon: Clock, label: "总时长", value: formatPlaytime(totalMinutes) },
              { icon: Trophy, label: "成就", value: String(unlockCount) },
              { icon: MessageSquare, label: "好友", value: String(friends.length) },
            ]}
          />
          <FriendsMini friends={friends} />
          <CommentWall posts={wallPosts} />
        </aside>
      </div>
    </main>
  );
}

/** 他人公开主页 */
async function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const [showcaseProducts, achievements, unlockCount] = await Promise.all([
    Promise.all(profile.showcase.map((slug) => getBySlug(slug))).then((ps) => ps.filter((p): p is NonNullable<typeof p> => Boolean(p))),
    getUserAchievementShowcase(profile.id, 6),
    countUserUnlocks(profile.id),
  ]);
  const wallPosts = getWallPosts();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6">
      <ProfileHeader
        name={profile.name}
        avatarHue={profile.avatarHue}
        avatarUrl={profile.avatarUrl}
        level={profile.level}
        handle={profile.handle}
        friendCode={profile.friendCode}
        signature={profile.signature}
        badges={profile.badges}
        actions={
          <span className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-dim" title="在好友面板用好友码添加">
            <UserPlus className="size-3.5" /> 好友码 {profile.friendCode}
          </span>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <FavoriteShowcase products={showcaseProducts} />
          <AchievementShowcase achievements={achievements} total={unlockCount} />
        </div>
        <aside className="space-y-4">
          <StatGrid
            stats={[
              { icon: Trophy, label: "成就", value: String(unlockCount) },
              { icon: LayoutGrid, label: "展柜", value: String(showcaseProducts.length) },
            ]}
          />
          <CommentWall posts={wallPosts} />
        </aside>
      </div>
    </main>
  );
}

// —— 共用块 ——
function ProfileHeader({
  name,
  avatarHue,
  avatarUrl,
  level,
  handle,
  friendCode,
  signature,
  badges,
  online,
  actions,
}: {
  name: string;
  avatarHue: number;
  avatarUrl: string | null;
  level: number;
  handle: string;
  friendCode: string | null;
  signature: string;
  badges: { label: string; icon: string }[];
  online?: boolean;
  actions: React.ReactNode;
}) {
  return (
    <>
      <div className={`-mx-4 h-40 ${BANNER} sm:-mx-6`} />
      <header className="relative z-10 -mt-12 flex flex-wrap items-end gap-5">
        <span className="relative rounded-2xl bg-panel p-1 shadow-[0_2px_12px_-4px_rgb(28_36_51/.2)]">
          <Avatar name={name} hue={avatarHue} src={avatarUrl} size="xl" className="rounded-2xl [&>img]:rounded-2xl [&>span]:rounded-2xl" />
          {online && <span className="absolute -right-1 -bottom-1 size-4 rounded-full bg-accent ring-2 ring-panel" />}
        </span>
        <div className="min-w-0 pb-1">
          <h1 className="flex items-center gap-3 text-2xl font-bold">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-dim">
            <span>@{handle}</span>
            {friendCode && <span className="rounded bg-card-hi px-1.5 py-0.5 font-mono text-xs text-accent">{friendCode}</span>}
          </p>
          {signature && <p className="mt-1 max-w-xl text-sm text-dim">{signature}</p>}
        </div>
        <div className="ml-auto flex items-end gap-4 pb-1">
          <div className="flex flex-col items-center">
            <LevelBadge level={level} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-1.5">{actions}</div>
            {badges.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {badges.map((badge) => {
                  const Icon = getProductIcon(badge.icon);
                  return (
                    <span key={badge.label} className="flex items-center gap-1 rounded-md border border-line bg-panel px-2 py-1 text-[11px] text-dim">
                      <Icon className="size-3 text-accent" /> {badge.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function StatGrid({ stats }: { stats: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[] }) {
  return (
    <div className={`grid gap-3 ${stats.length > 2 ? "grid-cols-2" : "grid-cols-2"}`}>
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="capsule p-3.5 text-center">
          <Icon className="mx-auto mb-1 size-4 text-accent/70" />
          <p className="text-lg font-bold">{value}</p>
          <p className="text-[11px] text-mute">{label}</p>
        </div>
      ))}
    </div>
  );
}

function CommentWall({ posts }: { posts: { author: string; avatarHue: number; body: string; date: string }[] }) {
  return (
    <div className="capsule p-5">
      <h3 className="mb-3 text-sm font-semibold">留言板</h3>
      <ul className="space-y-3.5">
        {posts.map((post) => (
          <li key={post.author + post.date} className="flex gap-2.5">
            <Avatar name={post.author} hue={post.avatarHue} size="sm" />
            <div className="min-w-0">
              <p className="text-xs text-mute">
                <span className="font-medium text-dim">{post.author}</span> · {post.date}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/85">{post.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductMini({ hueA, hueB, icon }: { slug: string; hueA: number; hueB: number; icon: string }) {
  const Icon = getProductIcon(icon);
  return (
    <span
      className="flex aspect-[16/9] items-center justify-center"
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 86%), hsl(${hueB} 55% 76%))` }}
    >
      <Icon className="size-1/3" style={{ color: `hsl(${hueA} 45% 38%)` }} />
    </span>
  );
}
