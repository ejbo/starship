import { Check } from "lucide-react";
import type { Product as DbProduct } from "@prisma/client";

/** 上架完善度引导：提醒开发者把媒体/介绍补全（尤其新建应用） */
export function AppCompleteness({ app }: { app: DbProduct }) {
  const descFilled = app.description.length > 0 && !(app.description.length === 1 && app.description[0].includes("待完善"));
  const items = [
    { label: "填写详细介绍", done: descFilled },
    { label: "添加标签", done: app.tags.length > 0 },
    { label: "上传封面或 Banner", done: Boolean(app.capsuleUrl || app.bannerUrl) },
    { label: "添加至少 2 张截图", done: (app.screenshotUrls?.length ?? 0) >= 2 },
    { label: "设置运行入口或预告视频", done: Boolean(app.entryUrl || app.trailerUrl) },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  const allDone = done === items.length;

  return (
    <div className="capsule space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{allDone ? "信息完善，随时可发布 🎉" : "完善你的应用"}</h2>
        <span className="text-xs text-mute">{done}/{items.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-card-hi">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-2 text-sm">
            <span
              className={
                it.done
                  ? "flex size-4 items-center justify-center rounded-full bg-free text-white"
                  : "size-4 rounded-full border border-line"
              }
            >
              {it.done && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className={it.done ? "text-dim line-through" : "text-ink"}>{it.label}</span>
          </li>
        ))}
      </ul>
      {!allDone && (
        <p className="text-xs text-mute">下方「媒体」区可上传封面、截图与预告视频——完善后再发布，商店里更吸引人。</p>
      )}
    </div>
  );
}
