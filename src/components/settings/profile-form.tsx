"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, Trash2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { updateAvatarAction, updateProfileAction } from "@/app/settings/profile/actions";

interface ProfileFormProps {
  handle: string;
  friendCode: string | null;
  name: string;
  signature: string;
  avatarHue: number;
  avatarUrl: string | null;
}

/** 客户端把图片缩放到 256×256 的 JPEG dataURL，控制体积 */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("无法处理图片"));
      // 居中裁剪为正方形
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    img.src = url;
  });
}

export function ProfileForm({ handle, friendCode, name, signature, avatarHue, avatarUrl }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(name);
  const [hue, setHue] = useState(avatarHue);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<null | { ok: boolean; error?: string }>(null);
  const [copied, setCopied] = useState(false);

  const onPickFile = async (file: File) => {
    setAvatarMsg("处理中…");
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const res = await updateAvatarAction(dataUrl);
      if (res.ok) {
        setAvatar(dataUrl);
        setAvatarMsg("已更新头像");
      } else {
        setAvatarMsg(res.error ?? "上传失败");
      }
    } catch (e) {
      setAvatarMsg(e instanceof Error ? e.message : "上传失败");
    }
  };

  const clearAvatar = async () => {
    const res = await updateAvatarAction("");
    if (res.ok) {
      setAvatar(null);
      setAvatarMsg("已恢复色相头像");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <form
        action={(fd) =>
          start(async () => {
            fd.set("avatarHue", String(hue));
            const res = await updateProfileAction(fd);
            setSaved(res);
          })
        }
        className="space-y-4"
      >
        {/* 用户名（只读）+ 好友码 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-dim">用户名（登录用，不可改）</span>
            <input
              value={handle}
              disabled
              className="w-full rounded-md border border-line bg-card-hi px-3 py-2 text-sm text-mute"
            />
          </label>
          <div className="space-y-1">
            <span className="text-xs text-dim">好友码（唯一，分享给好友）</span>
            <div className="flex items-center gap-2 rounded-md border border-line bg-card-hi px-3 py-2">
              <code className="grow font-mono text-sm font-semibold text-accent">{friendCode ?? "—"}</code>
              {friendCode && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(friendCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                  className="text-mute transition-colors hover:text-accent"
                  aria-label="复制好友码"
                >
                  {copied ? <span className="text-[11px] text-free">已复制</span> : <Copy className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-dim">昵称（可改、可与他人重名）</span>
          <input
            name="name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(null);
            }}
            maxLength={24}
            required
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-dim">个性签名</span>
          <textarea
            name="signature"
            defaultValue={signature}
            rows={2}
            maxLength={120}
            onChange={() => setSaved(null)}
            className="w-full resize-y rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-dim">头像色相</span>
          <input
            type="range"
            min={0}
            max={359}
            value={hue}
            onChange={(e) => {
              setHue(Number(e.target.value));
              setSaved(null);
            }}
            className="w-full accent-accent"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            {pending ? "保存中…" : "保存资料"}
          </button>
          {saved?.ok && <span className="text-sm text-free">已保存 ✓</span>}
          {saved && !saved.ok && <span className="text-sm text-danger">{saved.error}</span>}
        </div>
      </form>

      {/* 头像 + 实时预览 */}
      <div className="capsule h-fit p-5 text-center">
        <p className="mb-3 text-xs text-dim">头像</p>
        <span className="mx-auto block w-fit">
          <Avatar name={displayName || handle} hue={hue} src={avatar} size="xl" />
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-accent/40 hover:text-accent"
          >
            <Upload className="size-3.5" /> 上传图片
          </button>
          {avatar && (
            <button
              type="button"
              onClick={clearAvatar}
              className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-danger/40 hover:text-danger"
            >
              <Trash2 className="size-3.5" /> 移除
            </button>
          )}
        </div>
        {avatarMsg && <p className="mt-2 text-[11px] text-mute">{avatarMsg}</p>}
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-lg font-bold">{displayName || handle}</p>
          <p className="text-xs text-mute">@{handle} · {friendCode}</p>
        </div>
      </div>
    </div>
  );
}
