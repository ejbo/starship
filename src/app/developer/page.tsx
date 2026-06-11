import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Coins, Download, Plus, Sparkles, Star, Boxes } from "lucide-react";
import { CreateAppForm } from "@/components/developer/create-app-form";
import { TypeBadge } from "@/components/ui/type-badge";
import { getDeveloperStats, listMyApps } from "@/lib/developer-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const [apps, stats] = await Promise.all([listMyApps(), getDeveloperStats()]);
  const overview = [
    { icon: Boxes, label: "应用", value: `${stats.appCount}` },
    { icon: Sparkles, label: "已上架", value: `${stats.publishedCount}` },
    { icon: Download, label: "总获取", value: stats.totalAcquisitions.toLocaleString("zh-CN") },
    { icon: Star, label: "平均分", value: stats.avgRating ? stats.avgRating.toFixed(1) : "—" },
    { icon: Coins, label: "累计收益", value: stats.earnings.toLocaleString("zh-CN") },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">开发者中心</h1>
          <p className="mt-1 text-sm text-dim">上架应用，定义成就，接入开放 API。</p>
        </div>
        <Link
          href="/developer/integrate"
          className="flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/5 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          <Sparkles className="size-4" /> 接入与开放 API
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {overview.map(({ icon: Icon, label, value }) => (
          <div key={label} className="capsule p-3.5">
            <Icon className="mb-1.5 size-4 text-accent/70" />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[11px] text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 我的应用 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            我的应用 <span className="text-xs font-normal text-mute">{apps.length}</span>
          </h2>
          {apps.length === 0 ? (
            <div className="capsule p-6 text-center text-sm text-dim">
              还没有应用，从右侧创建第一个。
            </div>
          ) : (
            <ul className="space-y-2.5">
              {apps.map((app) => (
                <li key={app.id}>
                  <Link href={`/developer/${app.id}`} className="capsule flex items-center gap-3 p-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        {app.name}
                        <TypeBadge type={app.type} />
                        <span
                          className={
                            app.status === "published"
                              ? "rounded bg-free/10 px-1.5 py-0.5 text-[10px] font-medium text-free"
                              : app.status === "pending"
                                ? "rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                                : "rounded bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn"
                          }
                        >
                          {app.status === "published" ? "已上架" : app.status === "pending" ? "审核中" : "草稿"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-mute">
                        {app.acquisitions.toLocaleString("zh-CN")} 获取 · {app.ratingCount} 评测 · {app.achievementCount} 成就
                      </p>
                    </div>
                    <ChevronRight className="ml-auto size-4 text-mute" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 创建应用 */}
        <aside className="lg:sticky lg:top-18 lg:self-start">
          <div className="capsule p-5">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Plus className="size-4 text-accent" /> 创建应用
            </h2>
            <CreateAppForm />
          </div>
        </aside>
      </div>
    </main>
  );
}
