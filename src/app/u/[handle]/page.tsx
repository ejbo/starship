import { notFound, redirect } from "next/navigation";
import { Clock, LayoutGrid, LogOut, MessageSquare, Star } from "lucide-react";
import { FriendList } from "@/components/profile/friend-list";
import { Showcase } from "@/components/profile/showcase";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { getBySlug, getCurrentUser, getFriends, getWallPosts } from "@/lib/catalog";
import { logoutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle !== "me") notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const friends = await getFriends();
  const wallPosts = getWallPosts();
  const showcaseProducts = await Promise.all(user.showcase.map((slug) => getBySlug(slug)));
  const showcase = showcaseProducts.filter((p): p is NonNullable<typeof p> => Boolean(p));
  const totalHours = user.library.reduce((sum, e) => sum + e.usageHours, 0);
  const recentEntries = [...user.library]
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
    .slice(0, 3);
  const recentProducts = await Promise.all(recentEntries.map((e) => getBySlug(e.slug)));
  const recentlyUsed = recentEntries.map((entry, i) => ({ entry, name: recentProducts[i]?.name }));

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* 横幅 */}
      <div className="-mx-4 h-36 bg-gradient-to-r from-[#dbe5f3] via-[#e7edf6] to-[#dfe9f2] sm:-mx-6" />

      {/* 头像与身份 */}
      <header className="relative z-10 -mt-10 flex flex-wrap items-end gap-5">
        <span className="rounded-full bg-panel p-1 shadow-[0_2px_12px_-4px_rgb(28_36_51/.2)]">
          <Avatar name={user.name} hue={user.avatarHue} size="xl" />
        </span>
        <div className="pb-1">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {user.name}
            <span className="rounded-full border border-line bg-panel px-2.5 py-0.5 text-xs font-semibold text-dim">
              Lv.{user.level}
            </span>
          </h1>
          <p className="mt-1 text-sm text-dim">{user.signature}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-1">
          {user.badges.map((badge) => {
            const Icon = getProductIcon(badge.icon);
            return (
              <span key={badge.label} className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-dim">
                <Icon className="size-3.5 text-accent" /> {badge.label}
              </span>
            );
          })}
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-danger/40 hover:text-danger"
            >
              <LogOut className="size-3.5" /> 登出
            </button>
          </form>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 左主栏 */}
        <div className="min-w-0 space-y-6">
          {/* 统计 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: LayoutGrid, label: "库中产品", value: String(user.library.length) },
              { icon: Clock, label: "总使用时长", value: `${totalHours}h` },
              { icon: Star, label: "评测", value: "17" },
              { icon: MessageSquare, label: "圆桌主持", value: "9" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="capsule p-4 text-center">
                <Icon className="mx-auto mb-1.5 size-4 text-accent/70" />
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-mute">{label}</p>
              </div>
            ))}
          </div>

          <Showcase products={showcase} />

          {/* 最近动态 */}
          <div className="capsule p-5">
            <h3 className="mb-3 text-sm font-semibold">最近动态</h3>
            <ul className="space-y-2.5">
              {recentlyUsed.map(({ entry, name }) => {
                if (!name) return null;
                return (
                  <li key={entry.slug} className="flex items-center gap-2 text-sm text-dim">
                    <span className="size-1.5 rounded-full bg-accent/60" />
                    {entry.lastUsedAt} 使用了
                    <span className="font-medium text-ink">{name}</span>
                    <span className="ml-auto text-xs text-mute">{entry.usageHours}h</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 右侧栏 */}
        <aside className="space-y-4">
          <FriendList friends={friends} />
          <div className="capsule p-5">
            <h3 className="mb-3 text-sm font-semibold">留言板</h3>
            <ul className="space-y-3.5">
              {wallPosts.map((post) => (
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
        </aside>
      </div>
    </main>
  );
}
