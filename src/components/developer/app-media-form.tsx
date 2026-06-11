"use client";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { ImageField } from "@/components/ui/image-field";
import { ScreenshotsField } from "@/components/ui/screenshots-field";
import { updateAppMediaAction } from "@/app/developer/actions";

interface Props {
  id: string;
  initial: { capsuleUrl: string; bannerUrl: string; screenshotUrls: string[]; trailerUrl: string };
}

/** 开发者自助编辑应用媒体：封面 / banner / 截图（可选放哪些）/ 预告视频 */
export function AppMediaForm({ id, initial }: Props) {
  const [capsule, setCapsule] = useState(initial.capsuleUrl);
  const [banner, setBanner] = useState(initial.bannerUrl);
  const [shots, setShots] = useState<string[]>(initial.screenshotUrls);
  const [trailer, setTrailer] = useState(initial.trailerUrl);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    start(async () => {
      try {
        await updateAppMediaAction(id, {
          capsuleUrl: capsule.trim() || null,
          bannerUrl: banner.trim() || null,
          screenshotUrls: shots.map((s) => s.trim()).filter(Boolean),
          trailerUrl: trailer.trim() || null,
        });
        setMsg({ ok: true, text: "已保存" });
      } catch {
        setMsg({ ok: false, text: "保存失败" });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs text-dim">方形封面（卡片用）</span>
          <ImageField value={capsule} onChange={setCapsule} maxW={800} ratio="square" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-dim">宽幅 Banner（精选大图）</span>
          <ImageField value={banner} onChange={setBanner} maxW={1600} ratio="wide" />
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-xs text-dim">截图（你来决定详情页放哪些、什么顺序）</span>
        <ScreenshotsField value={shots} onChange={setShots} />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs text-dim">预告视频 URL（mp4 直链，可空）</span>
        <input
          value={trailer}
          onChange={(e) => setTrailer(e.target.value)}
          placeholder="https://….mp4"
          className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          <Save className="size-4" />
          {pending ? "保存中…" : "保存媒体"}
        </button>
        {msg && <span className={msg.ok ? "text-sm font-medium text-free" : "text-sm font-medium text-danger"}>{msg.text}</span>}
      </div>
    </div>
  );
}
