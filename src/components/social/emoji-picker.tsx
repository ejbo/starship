"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { EMOJI_GROUPS, loadRecentEmojis, pushRecentEmoji } from "./presence";

/** 分组 + 搜索 + 最近使用的 emoji 选择器（手维字典，不引第三方大包） */
export function EmojiPicker({ onPick, className }: { onPick: (em: string) => void; className?: string }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("recent");
  const recent = useMemo(() => loadRecentEmojis(), []);

  const pick = (em: string) => {
    pushRecentEmoji(em);
    onPick(em);
  };

  const tabs = [{ key: "recent", label: "最近" }, ...EMOJI_GROUPS.map((g) => ({ key: g.key, label: g.label }))];
  const searching = q.trim().length > 0;
  // 简单搜索：按分组 label 命中（emoji 无文本名，退化为「显示所有」时也可用）
  const shown: string[] = searching
    ? EMOJI_GROUPS.filter((g) => g.label.includes(q.trim())).flatMap((g) => g.emojis)
    : tab === "recent"
      ? recent
      : EMOJI_GROUPS.find((g) => g.key === tab)?.emojis ?? [];

  return (
    <div className={cn("w-64 rounded-xl border border-line bg-panel p-2 shadow-[0_12px_40px_-12px_rgb(28_36_51/.3)]", className)}>
      <label className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-line bg-page px-2 py-1 text-xs text-mute focus-within:border-accent">
        <Search className="size-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索分类（如 笑脸/动物）" className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none" />
      </label>
      {!searching && (
        <div className="mb-1 flex gap-0.5 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[11px] transition-colors", tab === t.key ? "bg-accent/10 text-accent" : "text-mute hover:text-ink")}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="grid max-h-40 grid-cols-8 gap-0.5 overflow-y-auto">
        {shown.length === 0 ? (
          <p className="col-span-8 py-3 text-center text-[11px] text-mute">{tab === "recent" ? "还没有最近使用" : "无"}</p>
        ) : (
          shown.map((em, i) => (
            <button key={em + i} onClick={() => pick(em)} className="rounded p-1 text-lg transition-colors hover:bg-card-hi">
              {em}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
