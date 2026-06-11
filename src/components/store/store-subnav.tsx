import Link from "next/link";
import { ChevronDown, Heart, Search, Trophy } from "lucide-react";
import { getWishlistCount } from "@/lib/wishlist-service";

type Item = { label: string; href: string };
const menus: { label: string; items: Item[] }[] = [
  {
    label: "浏览",
    items: [
      { label: "商店首页", href: "/" },
      { label: "全部应用", href: "/t/app" },
      { label: "排行榜", href: "/#charts" },
      { label: "新品", href: "/#charts" },
    ],
  },
  {
    label: "推荐",
    items: [
      { label: "为你推荐", href: "/#discovery" },
      { label: "精选与推荐", href: "/#featured" },
      { label: "高分作品", href: "/#charts" },
    ],
  },
  {
    label: "分类",
    items: [
      { label: "应用", href: "/t/app" },
      { label: "AI 模型", href: "/t/model" },
      { label: "Agent", href: "/t/agent" },
      { label: "Skill 工坊", href: "/t/skill" },
      { label: "互动教程", href: "/t/tutorial" },
      { label: "视频", href: "/t/video" },
    ],
  },
  {
    label: "更多",
    items: [
      { label: "开发者中心", href: "/developer" },
      { label: "平台接口", href: "/developer/integrate" },
      { label: "社区", href: "/community" },
    ],
  },
];

/** 商店子导航条（仿 Steam Browse/Recommendations/Categories/More + 搜索 + 心愿单）。 */
export async function StoreSubnav() {
  const wishCount = await getWishlistCount();
  return (
    <div className="sticky top-14 z-40 border-b border-line bg-panel/95 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4 sm:px-6">
        <div className="hidden items-center gap-1 md:flex">
        {menus.map((m) => (
          <div key={m.label} className="group relative">
            <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink">
              {m.label}
              <ChevronDown className="size-3.5 opacity-60 transition-transform group-hover:rotate-180" />
            </button>
            <div className="absolute left-0 top-full hidden min-w-44 pt-1 group-hover:block">
              <div className="capsule overflow-hidden py-1 shadow-lg">
                {m.items.map((it) => (
                  <Link
                    key={it.label + it.href}
                    href={it.href}
                    className="block px-3.5 py-2 text-sm text-dim transition-colors hover:bg-accent/8 hover:text-accent"
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
        </div>

        <form action="/search" className="flex items-center md:ml-auto">
          <label className="flex items-center gap-2 rounded-md border border-line bg-page px-3 py-1.5 text-sm text-mute transition-colors focus-within:border-accent">
            <Search className="size-3.5" />
            <input
              name="q"
              placeholder="搜索商店"
              className="w-36 bg-transparent text-ink placeholder:text-mute focus:outline-none sm:w-52"
            />
          </label>
        </form>

        <Link
          href="/wishlist"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink"
        >
          <Heart className="size-4 text-rose-500" />
          <span className="hidden sm:inline">心愿单</span>
          {wishCount > 0 && <span className="text-xs text-mute">{wishCount}</span>}
        </Link>
        <Link
          href="/#charts"
          className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-card-hi hover:text-ink sm:flex"
        >
          <Trophy className="size-4 text-star" />
          排行榜
        </Link>
      </div>
    </div>
  );
}
