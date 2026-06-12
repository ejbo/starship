"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, Loader2, Zap } from "lucide-react";
import { exchangeTokensAction } from "@/app/wallet/actions";
import { cn } from "@/lib/cn";

const PRESETS = [50, 100, 300, 1000];

/** 用点数兑换 Gateway token（1 点数 = TOKENS_PER_CREDIT token）。 */
export function TokenExchangePanel({ tokensPerCredit, credits }: { tokensPerCredit: number; credits: number }) {
  const router = useRouter();
  const [spend, setSpend] = useState(100);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const gain = spend * tokensPerCredit;
  const affordable = credits >= spend;

  function exchange() {
    setMsg(null);
    start(async () => {
      const res = await exchangeTokensAction(spend);
      if (res.ok) {
        setMsg({ ok: true, text: `已兑换 +${(res.added ?? 0).toLocaleString("zh-CN")} token` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "兑换失败" });
      }
    });
  }

  return (
    <div className="capsule space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setSpend(p)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              spend === p ? "border-accent bg-accent/8 text-accent" : "border-line text-dim hover:bg-card-hi",
            )}
          >
            {p} 点数
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-sm">
          <span className="text-mute">自定义</span>
          <input
            type="number"
            min={1}
            value={spend}
            onChange={(e) => setSpend(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-md border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="flex items-center justify-center gap-3 rounded-lg bg-card-hi p-4 text-center">
        <span className="flex items-center gap-1.5 text-lg font-bold">
          <Coins className="size-5 text-gold" /> {spend.toLocaleString("zh-CN")}
        </span>
        <span className="text-mute">→</span>
        <span className="flex items-center gap-1.5 text-lg font-bold text-accent">
          <Zap className="size-5" /> {gain.toLocaleString("zh-CN")} token
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={exchange}
          disabled={pending || !affordable}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          {pending ? "兑换中…" : "兑换"}
        </button>
        {!affordable && <span className="text-xs text-danger">点数不足</span>}
        {msg && <span className={cn("text-sm font-medium", msg.ok ? "text-free" : "text-danger")}>{msg.text}</span>}
      </div>
      <p className="text-[11px] text-mute">
        token 用于像 MultiLLM 这样的原生应用 —— 未配置自有密钥时，经平台调模型按用量消耗 token，多端同步。
      </p>
    </div>
  );
}
