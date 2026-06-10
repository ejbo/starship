"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { updateProfileAction } from "@/app/settings/profile/actions";

interface ProfileFormProps {
  handle: string;
  friendCode: string | null;
  name: string;
  signature: string;
  avatarHue: number;
}

export function ProfileForm({ handle, friendCode, name, signature, avatarHue }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(name);
  const [hue, setHue] = useState(avatarHue);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<null | { ok: boolean; error?: string }>(null);
  const [copied, setCopied] = useState(false);

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

      {/* 实时预览 */}
      <div className="capsule h-fit p-5 text-center">
        <p className="mb-3 text-xs text-dim">预览</p>
        <span className="mx-auto block w-fit">
          <Avatar name={displayName || handle} hue={hue} size="xl" />
        </span>
        <p className="mt-3 text-lg font-bold">{displayName || handle}</p>
        <p className="text-xs text-mute">@{handle} · {friendCode}</p>
      </div>
    </div>
  );
}
