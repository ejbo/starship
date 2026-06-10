import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { CreateAppForm } from "@/components/developer/create-app-form";
import { TypeBadge } from "@/components/ui/type-badge";
import { listMyApps } from "@/lib/developer-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DeveloperPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const apps = await listMyApps();

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">开发者中心</h1>
        <p className="mt-1 text-sm text-dim">上架应用，定义成就，接入开放 API。</p>
      </header>

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
                              : "rounded bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn"
                          }
                        >
                          {app.status === "published" ? "已发布" : "草稿"}
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
