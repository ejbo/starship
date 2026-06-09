"use client";

import { useRef, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { providers } from "@/lib/providers";
import { addCredentialAction } from "@/app/settings/gateway/actions";

export function AddCredentialForm() {
  const [provider, setProvider] = useState(providers[0].id);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const hint = providers.find((p) => p.id === provider)?.keyHint ?? "";

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setPending(true);
        try {
          await addCredentialAction(fd);
          formRef.current?.reset();
          setProvider(providers[0].id);
        } finally {
          setPending(false);
        }
      }}
      className="capsule space-y-3 p-5"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Plus className="size-4 text-accent" /> 添加密钥
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-dim">Provider</span>
          <select
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-dim">备注名</span>
          <input
            name="label"
            placeholder="如：个人主力"
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-dim">API Key</span>
        <input
          name="secret"
          type="password"
          required
          placeholder={hint}
          autoComplete="off"
          className="w-full rounded-md border border-line bg-page px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-dim">每日 token 上限（留空 = 不限）</span>
        <input
          name="dailyTokenLimit"
          type="number"
          min={0}
          placeholder="例如 2000000"
          className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>

      <p className="flex items-center gap-1.5 text-[11px] text-mute">
        <KeyRound className="size-3" /> 密钥提交即以 AES-256-GCM 加密落库，明文永不下发前端或第三方应用。
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
      >
        {pending ? "保存中…" : "保存密钥"}
      </button>
    </form>
  );
}
