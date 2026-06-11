"use client";
import { useRef, useState, useTransition } from "react";
import { ExternalLink, FileCode, Save, Sparkles, Upload } from "lucide-react";
import { updateAppHostingAction } from "@/app/developer/actions";
import { cn } from "@/lib/cn";

interface Props {
  id: string;
  slug: string;
  template: string;
  initial: { kind: "external" | "hosted"; entryUrl: string; launchMode: string; hostedHtml: string };
}

export function AppHostingForm({ id, slug, template, initial }: Props) {
  const [kind, setKind] = useState<"external" | "hosted">(initial.kind);
  const [entryUrl, setEntryUrl] = useState(initial.entryUrl);
  const [launchMode, setLaunchMode] = useState(initial.launchMode || "embedded");
  const [html, setHtml] = useState(initial.hostedHtml);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function save() {
    setMsg(null);
    start(async () => {
      try {
        if (kind === "hosted") {
          if (!html.trim()) {
            setMsg({ ok: false, text: "请先填入 HTML 或用模板" });
            return;
          }
          await updateAppHostingAction(id, { kind: "hosted", hostedHtml: html });
        } else {
          await updateAppHostingAction(id, { kind: "external", entryUrl: entryUrl.trim() || null, launchMode });
        }
        setMsg({ ok: true, text: "已保存" });
      } catch {
        setMsg({ ok: false, text: "保存失败" });
      }
    });
  }

  const card = (active: boolean) =>
    cn("rounded-lg border p-3 text-left transition-colors", active ? "border-accent bg-accent/5" : "border-line hover:bg-card-hi");
  const inputCls = "w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setKind("external")} className={card(kind === "external")}>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ExternalLink className="size-4" /> 外部部署
          </p>
          <p className="mt-1 text-xs text-mute">你自己部署的 web 应用，填入口地址</p>
        </button>
        <button type="button" onClick={() => setKind("hosted")} className={card(kind === "hosted")}>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <FileCode className="size-4" /> 平台托管单页
          </p>
          <p className="mt-1 text-xs text-mute">上传一个 HTML，平台在沙箱里跑，无需服务器</p>
        </button>
      </div>

      {kind === "external" ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-dim">入口 URL（你的部署地址）</span>
            <input value={entryUrl} onChange={(e) => setEntryUrl(e.target.value)} placeholder="https://my-app.example.com" className={inputCls} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-dim">运行方式</span>
            <select value={launchMode} onChange={(e) => setLaunchMode(e.target.value)} className={inputCls}>
              <option value="embedded">嵌入沙箱（iframe 内，用 postMessage SDK）</option>
              <option value="newtab">新标签页（独立 web 应用，用 OAuth + REST API）</option>
            </select>
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Upload className="size-3.5" /> 上传 .html
            </button>
            <button
              type="button"
              onClick={() => setHtml(template)}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Sparkles className="size-3.5" /> 用起始模板
            </button>
            <span className="text-xs text-mute">运行地址：/api/apps/{slug}/serve</span>
            <input
              ref={fileRef}
              type="file"
              accept=".html,text/html"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setHtml(await f.text());
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={14}
            placeholder="<!doctype html> … 你的单页应用"
            className="w-full resize-y rounded-md border border-line bg-page px-3 py-2 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
          <p className="text-[11px] leading-relaxed text-mute">
            在 HTML 里加 <code className="rounded bg-card-hi px-1">&lt;script src=&quot;/starport-sdk.js&quot;&gt;&lt;/script&gt;</code>，
            即可用 <code className="rounded bg-card-hi px-1">starport.identity()</code> /{" "}
            <code className="rounded bg-card-hi px-1">starport.ai.chat()</code> /{" "}
            <code className="rounded bg-card-hi px-1">starport.storage</code> 等。沙箱隔离运行，安全。
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          <Save className="size-4" /> {pending ? "保存中…" : "保存"}
        </button>
        {msg && <span className={msg.ok ? "text-sm font-medium text-free" : "text-sm font-medium text-danger"}>{msg.text}</span>}
      </div>
    </div>
  );
}
