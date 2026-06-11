"use client";
import { Plus, Trash2 } from "lucide-react";
import { ImageField } from "./image-field";

/** 截图集编辑：每条 URL 粘贴/上传 + 删除 + 添加。顺序即展示顺序。 */
export function ScreenshotsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-3">
      {value.map((s, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grow">
            <ImageField value={s} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} maxW={1280} ratio="wide" />
          </div>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="mt-1 rounded-md p-1.5 text-mute hover:text-danger"
            title="删除这张"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent"
      >
        <Plus className="size-3.5" /> 添加截图
      </button>
    </div>
  );
}
