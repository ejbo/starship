import { notFound } from "next/navigation";
import { Anchor, Clock, MessageSquare, Star } from "lucide-react";
import { FriendList } from "@/components/profile/friend-list";
import { Showcase } from "@/components/profile/showcase";
import { Avatar } from "@/components/ui/avatar";
import { getProductIcon } from "@/lib/icons";
import { getBySlug, getCurrentUser, getFriends, getWallPosts } from "@/lib/catalog";

export function generateStaticParams() {
  return [{ handle: "me" }];
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle !== "me") notFound();

  const user = getCurrentUser();
  const friends = getFriends();
  const wallPosts = getWallPosts();
  const showcase = user.showcase
    .map((slug) => getBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const totalHours = user.library.reduce((sum, e) => sum + e.usageHours, 0);
  const recentlyUsed = [...user.library]
    .sort((a, b) => (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? ""))
    .slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* 星云横幅 */}
      <div
        className="relative -mx-4 h-44 overflow-hidden sm:-mx-6"
        style={{
          background:
            "radial-gradient(800px 300px at 20% 100%, rgb(83 216 255 / .18), transparent 60%), radial-gradient(700px 280px at 80% 0%, rgb(157 123 255 / .2), transparent 60%), linear-gradient(160deg, #0d1424, #131c33)",
        }}
      >
        <div className="starfield absolute inset-0 opacity-70" style={{ position: "absolute" }} />
      </div>

      {/* 头像与身份 */}
      <header className="relative z-10 -mt-12 flex flex-wrap items-end gap-5 animate-[fade-up_.5s_ease_both]">
        <span className="rounded-full p-1 ring-2 ring-aurora/50 bg-abyss shadow-[0_0_30px_-6px_rgb(83_216_255/.5)]">
          <Avatar name={user.name} hue={user.avatarHue} size="xl" />
        </span>
        <div className="pb-1">
          <h1 className="flex items-center gap-3 text-2xl font-bold">
            {user.name}
            <span className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-display text-xs font-bold text-gold">
              Lv.{user.level}
            </span>
          </h1>
          <p className="mt-1 text-sm text-dim">{user.signature}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2 pb-1">
          {user.badges.map((badge) => {
            const Icon = getProductIcon(badge.icon);
            return (
              <span key={badge.label} className="flex items-center gap-1.5 rounded-md border border-line bg-panel/70 px-2.5 py-1.5 text-xs text-dim">
                <Icon className="size-3.5 text-gold" /> {badge.label}
              </span>
            );
          })}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 左主栏 */}
        <div className="min-w-0 space-y-6 animate-[fade-up_.5s_ease_both]" style={{ animationDelay: "100ms" }}>
          {/* 统计 */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Anchor, label: "停泊造物", value: String(user.library.length) },
              { icon: Clock, label: "总使用时长", value: `${totalHours}h` },
              { icon: Star, label: "评测", value: "17" },
              { icon: MessageSquare, label: "圆桌主持", value: "9" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="capsule p-4 text-center hover:translate-y-0">
                <Icon className="mx-auto mb-1.5 size-4 text-aurora/70" />
                <p className="font-display text-xl font-bold">{value}</p>
                <p className="text-xs text-mute">{label}</p>
              </div>
            ))}
          </div>

          <Showcase products={showcase} />

          {/* 最近动态 */}
          <div className="capsule p-5 hover:translate-y-0">
            <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
              最近动态 <span className="font-display text-[10px] tracking-[0.25em] text-mute">ACTIVITY</span>
            </h3>
            <ul className="space-y-2.5">
              {recentlyUsed.map((entry) => {
                const product = getBySlug(entry.slug);
                if (!product) return null;
                return (
                  <li key={entry.slug} className="flex items-center gap-2 text-sm text-dim">
                    <span className="size-1.5 rounded-full bg-aurora/70" />
                    {entry.lastUsedAt} 使用了
                    <span className="font-medium text-ink">{product.name}</span>
                    <span className="ml-auto font-display text-xs text-mute">{entry.usageHours}h</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 右侧栏 */}
        <aside className="space-y-4 animate-[fade-up_.5s_ease_both]" style={{ animationDelay: "160ms" }}>
          <FriendList friends={friends} />
          <div className="capsule p-5 hover:translate-y-0">
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
