import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { AchievementsEditor } from "@/components/developer/achievements-editor";
import { AppCredentials } from "@/components/developer/app-credentials";
import { AppMetaForm } from "@/components/developer/app-meta-form";
import { PublishToggle } from "@/components/developer/publish-toggle";
import { getMyApp } from "@/lib/developer-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ secret?: string }>;
}) {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const { id } = await params;
  const { secret } = await searchParams;
  const app = await getMyApp(id);
  if (!app) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <nav className="mb-4 flex items-center gap-1 text-xs text-mute">
        <Link href="/developer" className="flex items-center gap-1 transition-colors hover:text-accent">
          <ChevronLeft className="size-3.5" /> 开发者中心
        </Link>
      </nav>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{app.name}</h1>
        <code className="rounded bg-card-hi px-1.5 py-0.5 font-mono text-xs text-mute">/p/{app.slug}</code>
        {app.status === "published" && (
          <Link href={`/p/${app.slug}`} className="flex items-center gap-1 text-xs text-accent hover:underline">
            查看商店页 <ExternalLink className="size-3" />
          </Link>
        )}
      </header>

      <div className="space-y-6">
        <Section title="发布状态">
          <PublishToggle id={app.id} published={app.status === "published"} />
        </Section>

        <Section title="应用信息">
          <AppMetaForm
            id={app.id}
            initial={{
              tagline: app.tagline === "（待完善）" ? "" : app.tagline,
              description: app.description.join("\n\n").replace("（待完善）", ""),
              tags: app.tags.join(", "),
              capabilities: app.capabilities.join(" "),
              entryUrl: app.entryUrl ?? "",
              icon: app.icon,
              priceCredits: app.priceCredits?.toString() ?? "",
            }}
          />
        </Section>

        <Section title="成就（原生支持）">
          <AchievementsEditor
            productId={app.id}
            achievements={app.achievements.map((a) => ({
              id: a.id,
              key: a.key,
              name: a.name,
              description: a.description,
              icon: a.icon,
            }))}
          />
        </Section>

        <Section title="开放 API 凭证">
          <AppCredentials id={app.id} clientId={app.clientId ?? ""} freshSecret={secret} />
        </Section>

        <Section title="接入文档">
          <ApiDocs clientId={app.clientId ?? ""} slug={app.slug} />
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="capsule p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ApiDocs({ clientId, slug }: { clientId: string; slug: string }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-dim">外部 web 应用通过 OAuth2 取用户授权令牌后调用开放 API：</p>
      <pre className="overflow-x-auto rounded-md border border-line bg-page p-3 font-mono text-[11px] leading-relaxed text-ink">
{`# 1) 引导用户授权（浏览器）
GET /oauth/authorize?client_id=${clientId || "<client_id>"}
      &redirect_uri=<你的回调>&scope=identity,achievements:write,stats:write

# 2) 用 code 换 access_token（服务器到服务器）
POST /api/v1/oauth/token
  { "client_id":"${clientId || "<client_id>"}", "client_secret":"<secret>", "code":"<code>" }

# 3) 调用（Authorization: Bearer <access_token>）
GET  /api/v1/me                       # 读用户公开资料
GET  /api/v1/achievements?app=${slug}  # 成就 schema + 解锁态
POST /api/v1/achievements/unlock       # { "app":"${slug}", "key":"first_win" }
POST /api/v1/stats                     # { "app":"${slug}", "playtimeMinutes":30 }
GET  /api/v1/stats/global?app=${slug}  # 全站成就稀有度`}
      </pre>
      <p className="text-[11px] text-mute">沙箱内运行的应用则用注入的 Platform SDK：starport.achievements.unlock(key) / starport.stats.submit(...)。</p>
    </div>
  );
}
