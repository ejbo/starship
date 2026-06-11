"use client";
import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";

/** 文件 → 等比缩放到 maxW → JPEG dataURL（避免大图直接塞库） */
async function fileToDataUrl(file: File, maxW: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface ImageFieldProps {
  value: string;
  onChange: (v: string) => void;
  maxW?: number;
  /** 预览比例 */
  ratio?: "wide" | "square";
  placeholder?: string;
}

export function ImageField({ value, onChange, maxW = 1280, ratio = "wide", placeholder = "粘贴图片 URL，或点上传" }: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 grow rounded-md border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          上传
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await fileToDataUrl(f, maxW));
            } finally {
              setBusy(false);
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
        />
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className={`${ratio === "square" ? "aspect-square w-24" : "aspect-[16/9] w-full max-w-xs"} rounded-md border border-line object-cover`}
        />
      ) : (
        <div
          className={`${ratio === "square" ? "aspect-square w-24" : "aspect-[16/9] w-full max-w-xs"} flex items-center justify-center rounded-md border border-dashed border-line text-mute`}
        >
          <ImageIcon className="size-5" />
        </div>
      )}
    </div>
  );
}
