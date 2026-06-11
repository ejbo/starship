"use client";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { ImageField } from "@/components/ui/image-field";
import { createBannerAction, deleteBannerAction, updateBannerAction } from "@/app/admin/actions";

export interface BannerView {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  videoUrl: string;
  href: string;
  active: boolean;
  sort: number;
}

const inputCls = "w-full rounded-md border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none";

function BannerEditor({ banner, onRemoved }: { banner: BannerView | null; onRemoved?: () => void }) {
  const isNew = banner == null;
  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [badge, setBadge] = useState(banner?.badge ?? "");
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(banner?.videoUrl ?? "");
  const [href, setHref] = useState(banner?.href ?? "/#featured");
  const [active, setActive] = useState(banner?.active ?? true);
  const [sort, setSort] = useState(banner?.sort ?? 0);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    const input = { title: title.trim(), subtitle: subtitle.trim(), badge: badge.trim(), imageUrl: imageUrl.trim(), videoUrl: videoUrl.trim(), href: href.trim() || "/#featured", active, sort: Number(sort) || 0 };
    if (!input.title || !input.imageUrl) {
      setMsg({ ok: false, text: "标题和图片必填" });
      return;
    }
    start(async () => {
      try {
        if (isNew) {
          await createBannerAction(input);
          setTitle(""); setSubtitle(""); setBadge(""); setImageUrl(""); setVideoUrl(""); setHref("/#featured"); setActive(true); setSort(0);
          setMsg({ ok: true, text: "已新增" });
        } else {
          await updateBannerAction(banner!.id, input);
          setMsg({ ok: true, text: "已保存" });
        }
      } catch {
        setMsg({ ok: false, text: "操作失败" });
      }
    });
  }

  function remove() {
    if (!banner) return;
    start(async () => {
      try {
        await deleteBannerAction(banner.id);
        onRemoved?.();
      } catch {
        setMsg({ ok: false, text: "删除失败" });
      }
    });
  }

  return (
    <div className="capsule space-y-4 p-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-dim">标题</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="星港首发季" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-dim">副标题</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-dim">小标签</span>
              <input value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} placeholder="限时 · 至 6/30" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-dim">点击跳转</span>
              <input value={href} onChange={(e) => setHref(e.target.value)} className={inputCls} placeholder="/#featured" />
            </label>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-accent" />
              启用
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs text-dim">排序</span>
              <input type="number" value={sort} onChange={(e) => setSort(Number(e.target.value))} className="w-20 rounded-md border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none" />
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-dim">横幅图片（视频的封面/降级图）</span>
            <ImageField value={imageUrl} onChange={setImageUrl} maxW={1920} ratio="wide" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-dim">动图/视频地址（可选，mp4 / webm / gif）</span>
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={inputCls} placeholder="https://… .mp4（留空则用静态图）" />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60">
          <Save className="size-4" /> {isNew ? "新增" : "保存"}
        </button>
        {msg && <span className={msg.ok ? "text-sm font-medium text-free" : "text-sm font-medium text-danger"}>{msg.text}</span>}
        {!isNew && (
          <button onClick={remove} disabled={pending} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-dim transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-60">
            <Trash2 className="size-4" /> 删除
          </button>
        )}
      </div>
    </div>
  );
}

export function BannerManager({ banners }: { banners: BannerView[] }) {
  const [showNew, setShowNew] = useState(false);
  return (
    <div className="space-y-4">
      {banners.map((b) => (
        <BannerEditor key={b.id} banner={b} />
      ))}
      {showNew ? (
        <BannerEditor banner={null} onRemoved={() => setShowNew(false)} />
      ) : (
        <button onClick={() => setShowNew(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-3 text-sm font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent">
          <Plus className="size-4" /> 新增 banner
        </button>
      )}
    </div>
  );
}
