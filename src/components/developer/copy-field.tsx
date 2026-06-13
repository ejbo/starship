"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";

export function CopyField({ label, value }: { label?: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      {label && <p className="mb-1 text-xs text-dim">{label}</p>}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-page px-3 py-2">
        <code className="min-w-0 grow truncate font-mono text-xs text-ink">{value}</code>
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
      </div>
    </div>
  );
}
