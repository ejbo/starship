"use client";

import { useMemo, useState } from "react";
import { Check, Search, Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { Friend } from "@/lib/types";
import { display, presenceMeta, statusText } from "./presence";

export interface GroupModalProps {
  title: string;
  confirmLabel: string;
  friends: Friend[];
  /** 不可选（已在群内）的 handle */
  disabledHandles?: string[];
  /** 预先勾选的 handle（从私聊「邀请到群组」进入时带上当前好友） */
  preselected?: string[];
  /** 显示群名输入框（建群时） */
  withName?: boolean;
  onConfirm: (handles: string[], name: string) => Promise<void>;
  onClose: () => void;
}

/** 选好友建群 / 邀请进群（Steam 的好友选择器） */
export function GroupModal({ title, confirmLabel, friends, disabledHandles = [], preselected = [], withName, onConfirm, onClose }: GroupModalProps) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = useMemo(() => new Set(disabledHandles), [disabledHandles]);

  const list = friends.filter((f) => display(f).includes(query) || f.name.includes(query) || f.handle.includes(query));

  const toggle = (handle: string) => {
    if (disabled.has(handle)) return;
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm([...selected], name.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[24rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(28_36_51/.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Users className="size-4 text-accent" />
          <p className="text-sm font-semibold">{title}</p>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 border-b border-line px-4 py-2.5">
          {withName && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="群组名称（留空则按成员自动命名）"
              className="w-full rounded-lg border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
          )}
          <label className="flex items-center gap-2 rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm text-mute focus-within:border-accent">
            <Search className="size-3.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索好友"
              className="w-full bg-transparent text-ink placeholder:text-mute focus:outline-none"
            />
          </label>
        </div>

        <div className="grow overflow-y-auto px-2 py-1.5">
          {list.length === 0 ? (
            <p className="px-2 pt-6 text-center text-xs text-mute">没有匹配的好友</p>
          ) : (
            list.map((f) => {
              const meta = presenceMeta[f.presence.kind];
              const off = f.presence.kind === "offline";
              const inGroup = disabled.has(f.handle);
              const checked = selected.has(f.handle) || inGroup;
              return (
                <button
                  key={f.handle}
                  onClick={() => toggle(f.handle)}
                  disabled={inGroup}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                    inGroup ? "opacity-45" : "hover:bg-card-hi",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                      checked ? "border-accent bg-accent text-white" : "border-line bg-page",
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="relative shrink-0">
                    <Avatar name={display(f)} hue={f.avatarHue} src={f.avatarUrl} size="sm" className={cn(off && "opacity-45")} />
                    <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className={cn("block truncate text-sm", off ? "text-dim" : "text-ink")}>
                      {f.name}
                      {f.remark && <span className="ml-1 text-xs text-mute">（{f.remark}）</span>}
                    </span>
                    <span className={cn("block truncate text-[11px]", meta.tone)}>{inGroup ? "已在群组中" : statusText(f)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="text-xs text-mute">已选 {selected.size} 人</span>
          {error && <span className="truncate text-xs text-danger">{error}</span>}
          <button
            onClick={submit}
            disabled={selected.size === 0 || busy}
            className="ml-auto rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-40"
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
