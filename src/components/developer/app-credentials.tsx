"use client";

import { useState } from "react";
import { Copy, Eye, KeyRound, RefreshCw } from "lucide-react";
import { regenerateSecretAction } from "@/app/developer/actions";
import { copyText } from "@/lib/clipboard";

export function AppCredentials({ id, clientId, freshSecret }: { id: string; clientId: string; freshSecret?: string }) {
  const [secret, setSecret] = useState<string | null>(freshSecret ?? null);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      <Row label="client_id" value={clientId} mono />

      {secret ? (
        <div className="rounded-md border border-warn/40 bg-warn/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-warn">
            <Eye className="size-3.5" /> client_secret —— 仅此一次完整展示，请妥善保存
          </p>
          <Row label="" value={secret} mono />
        </div>
      ) : (
        <Row label="client_secret" value="已隐藏（创建/重置时展示一次）" />
      )}

      <button
        onClick={async () => {
          setPending(true);
          try {
            const s = await regenerateSecretAction(id);
            setSecret(s);
          } finally {
            setPending(false);
          }
        }}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
      >
        <RefreshCw className="size-3.5" /> {pending ? "生成中…" : "重置密钥"}
      </button>

      <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-mute">
        <KeyRound className="size-3" /> 用 client_id + client_secret 走 OAuth2 取用户授权令牌，调用 /api/v1/*（见下方接入文档）。
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && <p className="mb-1 text-xs text-dim">{label}</p>}
      <div className="flex items-center gap-2 rounded-md border border-line bg-page px-3 py-2">
        <code className={mono ? "min-w-0 grow truncate font-mono text-xs text-ink" : "min-w-0 grow truncate text-xs text-mute"}>
          {value}
        </code>
        {mono && (
          <button
            onClick={async () => {
              if (await copyText(value)) {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }
            }}
            className="shrink-0 text-mute transition-colors hover:text-accent"
            aria-label="复制"
          >
            {copied ? <span className="text-[11px] text-free">已复制</span> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
