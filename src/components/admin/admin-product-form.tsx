"use client";
import { useState, useTransition, type ReactNode } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { ImageField } from "./image-field";
import { saveProductAction } from "@/app/admin/actions";
import type { AdminProductInput } from "@/lib/admin-service";
import type { Product as DbProduct } from "@prisma/client";

const TYPES: [string, string][] = [
  ["app", "应用"],
  ["model", "模型"],
  ["agent", "Agent"],
  ["skill", "Skill"],
  ["tutorial", "教程"],
  ["video", "视频"],
];

function L({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-dim">
        {label}
        {hint && <span className="ml-1.5 font-normal text-mute">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-md border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

export function AdminProductForm({ product }: { product: DbProduct }) {
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline);
  const [developer, setDeveloper] = useState(product.developer);
  const [version, setVersion] = useState(product.version ?? "");
  const [type, setType] = useState(product.type as string);
  const [status, setStatus] = useState(product.status);
  const [featured, setFeatured] = useState(product.featured);
  const [descText, setDescText] = useState(product.description.join("\n"));
  const [tagsText, setTagsText] = useState(product.tags.join(", "));
  const [capsText, setCapsText] = useState(product.capabilities.join(", "));
  const [priceText, setPriceText] = useState(product.priceCredits == null ? "" : String(product.priceCredits));
  const [icon, setIcon] = useState(product.icon);
  const [hueA, setHueA] = useState(product.hueA);
  const [hueB, setHueB] = useState(product.hueB);
  const [capsuleUrl, setCapsuleUrl] = useState(product.capsuleUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(product.bannerUrl ?? "");
  const [trailerUrl, setTrailerUrl] = useState(product.trailerUrl ?? "");
  const [shots, setShots] = useState<string[]>(product.screenshotUrls ?? []);
  const [launchMode, setLaunchMode] = useState(product.launchMode);
  const [entryUrl, setEntryUrl] = useState(product.entryUrl ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const splitList = (s: string) => s.split(/[,，]/).map((x) => x.trim()).filter(Boolean);

  function save() {
    const input: AdminProductInput = {
      name: name.trim(),
      tagline: tagline.trim(),
      developer: developer.trim(),
      version: version.trim() || null,
      type,
      description: descText.split("\n").map((x) => x.trim()).filter(Boolean),
      tags: splitList(tagsText),
      capabilities: splitList(capsText),
      priceCredits: priceText.trim() === "" ? null : Math.max(0, Math.round(Number(priceText) || 0)),
      icon: icon.trim() || "grid",
      hueA: Number(hueA) || 0,
      hueB: Number(hueB) || 0,
      capsuleUrl: capsuleUrl.trim() || null,
      bannerUrl: bannerUrl.trim() || null,
      screenshotUrls: shots.map((s) => s.trim()).filter(Boolean),
      trailerUrl: trailerUrl.trim() || null,
      launchMode,
      entryUrl: entryUrl.trim() || null,
      status,
      featured,
    };
    if (!input.name) {
      setMsg({ ok: false, text: "名称不能为空" });
      return;
    }
    start(async () => {
      try {
        await saveProductAction(product.id, input);
        setMsg({ ok: true, text: "已保存" });
      } catch {
        setMsg({ ok: false, text: "保存失败" });
      }
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 基本信息 */}
      <section className="capsule space-y-4 p-5">
        <h2 className="text-sm font-bold">基本信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="名称"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></L>
          <L label="开发者"><input value={developer} onChange={(e) => setDeveloper(e.target.value)} className={inputCls} /></L>
        </div>
        <L label="一句话简介"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} /></L>
        <L label="详细介绍" hint="每行一段"><textarea value={descText} onChange={(e) => setDescText(e.target.value)} rows={5} className={inputCls} /></L>
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="类型">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </L>
          <L label="版本" hint="可空"><input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} placeholder="v1.0.0" /></L>
          <L label="标签" hint="逗号分隔"><input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className={inputCls} /></L>
        </div>
      </section>

      {/* 媒体 */}
      <section className="capsule space-y-4 p-5">
        <h2 className="text-sm font-bold">媒体</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <L label="方形封面" hint="卡片用"><ImageField value={capsuleUrl} onChange={setCapsuleUrl} maxW={800} ratio="square" /></L>
          <L label="宽幅 Banner" hint="精选大图用"><ImageField value={bannerUrl} onChange={setBannerUrl} maxW={1600} ratio="wide" /></L>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-medium text-dim">截图（精选卡 2×2 / 详情页画廊）</span>
          <div className="space-y-3">
            {shots.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="grow">
                  <ImageField value={s} onChange={(v) => setShots((arr) => arr.map((x, j) => (j === i ? v : x)))} maxW={1280} ratio="wide" />
                </div>
                <button type="button" onClick={() => setShots((arr) => arr.filter((_, j) => j !== i))} className="mt-1 rounded-md p-1.5 text-mute hover:text-danger" title="删除">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setShots((arr) => [...arr, ""])} className="flex items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent">
              <Plus className="size-3.5" /> 添加截图
            </button>
          </div>
        </div>
        <L label="预告视频 URL" hint="mp4 直链，可空"><input value={trailerUrl} onChange={(e) => setTrailerUrl(e.target.value)} className={inputCls} placeholder="https://….mp4" /></L>
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="兜底图标" hint="无图时用"><input value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} /></L>
          <L label="渐变色相 A"><input type="number" value={hueA} onChange={(e) => setHueA(Number(e.target.value))} className={inputCls} /></L>
          <L label="渐变色相 B"><input type="number" value={hueB} onChange={(e) => setHueB(Number(e.target.value))} className={inputCls} /></L>
        </div>
      </section>

      {/* 上架 / 运行 / 价格 */}
      <section className="capsule space-y-4 p-5">
        <h2 className="text-sm font-bold">上架与运行</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="状态">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="published">已上架</option>
              <option value="draft">草稿（下架）</option>
            </select>
          </L>
          <L label="运行方式">
            <select value={launchMode} onChange={(e) => setLaunchMode(e.target.value)} className={inputCls}>
              <option value="embedded">沙箱内嵌</option>
              <option value="newtab">新标签页</option>
            </select>
          </L>
          <L label="价格" hint="空=免费"><input value={priceText} onChange={(e) => setPriceText(e.target.value)} className={inputCls} placeholder="点数" /></L>
        </div>
        <L label="入口 URL" hint="应用部署地址，可空"><input value={entryUrl} onChange={(e) => setEntryUrl(e.target.value)} className={inputCls} /></L>
        <L label="运行要求" hint="逗号分隔，如 llm:claude, storage:1gb"><input value={capsText} onChange={(e) => setCapsText(e.target.value)} className={inputCls} /></L>
        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 accent-accent" />
          设为精选（进首页「精选与推荐」轮播）
        </label>
      </section>

      {/* 保存条 */}
      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "保存中…" : "保存"}
        </button>
        {msg && <span className={msg.ok ? "text-sm font-medium text-free" : "text-sm font-medium text-danger"}>{msg.text}</span>}
        <span className="ml-auto text-xs text-mute">slug：{product.slug}（不可改）</span>
      </div>
    </div>
  );
}
