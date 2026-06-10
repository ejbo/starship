import Link from "next/link";
import { headers } from "next/headers";
import { ChevronLeft, ExternalLink, FileCode, Sparkles } from "lucide-react";
import { CopyField } from "@/components/developer/copy-field";
import { ENDPOINTS, SCOPES, SDK_METHODS } from "@/lib/platform-manifest";

export const dynamic = "force-dynamic";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

const authLabel = (e: (typeof ENDPOINTS)[number]) =>
  e.auth === "none" ? "公开" : e.auth === "app_secret" ? "应用密钥" : `Bearer${e.scope ? ` · ${e.scope}` : ""}`;

export default async function IntegratePage() {
  const base = await baseUrl();

  return (
    <main className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
      <nav className="mb-4 flex items-center gap-1 text-xs text-mute">
        <Link href="/developer" className="flex items-center gap-1 transition-colors hover:text-accent">
          <ChevronLeft className="size-3.5" /> 开发者中心
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">接入与开放 API</h1>
        <p className="mt-1 text-sm text-dim">把你的应用接入星港，或让 AI agent 自动识别并调用平台接口。</p>
      </header>

      {/* 给 AI agent 的入口 */}
      <section className="capsule mb-6 p-5">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-accent" /> 给 AI Agent 用（仿 Claude Skills）
        </h2>
        <p className="mb-3 text-sm leading-relaxed text-dim">
          平台提供两份自描述文件，让 agent 无需人工对接即可发现并使用全部接口——先读清单、再按需调用：
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <FileCode className="size-3.5 text-accent" /> 机器可读清单（JSON）
            </p>
            <CopyField value={`${base}/api/v1/manifest`} />
            <p className="text-[11px] text-mute">程序化枚举全部接口、参数、鉴权、scope。</p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <FileCode className="size-3.5 text-accent" /> SKILL.md（Claude-skill 风格）
            </p>
            <CopyField value={`${base}/skill`} />
            <p className="text-[11px] text-mute">带 frontmatter 的技能说明，agent 可直接读取遵循。</p>
          </div>
        </div>
        <Link href="/skill" target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline">
          预览 SKILL.md <ExternalLink className="size-3" />
        </Link>
      </section>

      {/* OAuth 流程 */}
      <section className="capsule mb-6 p-5">
        <h2 className="mb-3 text-sm font-semibold">外部应用接入（OAuth2 授权码）</h2>
        <ol className="space-y-2 text-sm text-dim">
          <li>1. 在开发者中心创建应用，获取 <code className="rounded bg-card-hi px-1 text-xs">client_id</code> 与一次性 <code className="rounded bg-card-hi px-1 text-xs">client_secret</code>。</li>
          <li>2. 引导用户到 <code className="rounded bg-card-hi px-1 text-xs">/oauth/authorize?client_id=…&scope=…</code> 授权。</li>
          <li>3. 用返回的 <code className="rounded bg-card-hi px-1 text-xs">code</code> 在后端调 <code className="rounded bg-card-hi px-1 text-xs">POST /api/v1/oauth/token</code> 换 access_token。</li>
          <li>4. 之后请求带 <code className="rounded bg-card-hi px-1 text-xs">Authorization: Bearer &lt;token&gt;</code>。</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(SCOPES).map(([k, v]) => (
            <span key={k} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-dim" title={v}>
              {k}
            </span>
          ))}
        </div>
      </section>

      {/* 接口清单表 */}
      <section className="capsule mb-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">接口清单</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-mute">
              <th className="px-4 py-2 font-medium">方法</th>
              <th className="px-4 py-2 font-medium">路径</th>
              <th className="px-4 py-2 font-medium">说明</th>
              <th className="px-4 py-2 font-medium">鉴权</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr key={e.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2.5">
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${e.method === "GET" ? "bg-accent/8 text-accent" : "bg-green/10 text-green"}`}>{e.method}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.path}</td>
                <td className="px-4 py-2.5 text-dim">{e.summary}</td>
                <td className="px-4 py-2.5 text-xs text-mute">{authLabel(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 沙箱 SDK */}
      <section className="capsule p-5">
        <h2 className="mb-1 text-sm font-semibold">沙箱内应用 · Platform SDK</h2>
        <p className="mb-3 text-sm text-dim">运行在星港内的应用，平台注入 <code className="rounded bg-card-hi px-1 text-xs">/starport-sdk.js</code>，直接调用 <code className="rounded bg-card-hi px-1 text-xs">window.starport</code>：</p>
        <ul className="space-y-1.5 text-sm">
          {SDK_METHODS.map((s) => (
            <li key={s.name} className="flex flex-col gap-0.5 rounded-md border border-line px-3 py-2 sm:flex-row sm:items-center sm:gap-3">
              <code className="font-mono text-xs text-accent">{s.signature}</code>
              <span className="text-xs text-mute">{s.summary}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
