"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Coins, Loader2, X } from "lucide-react";
import { topUpAction } from "@/app/wallet/actions";
import { cn } from "@/lib/cn";

interface Pkg {
  credits: number;
  price: number;
  bonus?: number;
  tag?: string;
}

const PACKAGES: Pkg[] = [
  { credits: 100, price: 10 },
  { credits: 500, price: 50 },
  { credits: 1000, price: 100, bonus: 50 },
  { credits: 3000, price: 300, bonus: 300, tag: "热门" },
  { credits: 6000, price: 600, bonus: 800 },
  { credits: 12000, price: 1200, bonus: 2000, tag: "超值" },
];

const METHODS = [
  { id: "wechat", label: "微信支付", color: "#1aad19" },
  { id: "alipay", label: "支付宝", color: "#1677ff" },
  { id: "card", label: "银行卡", color: "#5a6474" },
];

export function TopUpPanel() {
  const router = useRouter();
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [method, setMethod] = useState("wechat");
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  const total = pkg ? pkg.credits + (pkg.bonus ?? 0) : 0;

  function pay() {
    if (!pkg) return;
    start(async () => {
      await topUpAction(total, method);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setPkg(null);
        router.refresh();
      }, 1400);
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PACKAGES.map((p) => (
          <button
            key={p.credits}
            onClick={() => {
              setPkg(p);
              setDone(false);
            }}
            className="capsule relative p-4 text-center transition-transform hover:-translate-y-0.5 hover:border-accent/50"
          >
            {p.tag && (
              <span className="absolute -top-2 right-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-white">{p.tag}</span>
            )}
            <p className="flex items-center justify-center gap-1 text-xl font-bold">
              <Coins className="size-4 text-gold" />
              {p.credits.toLocaleString("zh-CN")}
            </p>
            {p.bonus ? <p className="text-xs font-medium text-free">送 {p.bonus}</p> : <p className="text-xs text-transparent">·</p>}
            <p className="mt-1 text-sm text-dim">¥{p.price}</p>
          </button>
        ))}
      </div>

      {pkg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={() => !pending && setPkg(null)}
        >
          <div className="capsule w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-free/12 text-free">
                  <Check className="size-7" strokeWidth={3} />
                </span>
                <p className="text-lg font-bold">充值成功</p>
                <p className="text-sm text-dim">到账 +{total.toLocaleString("zh-CN")} 点数</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold">确认充值</h3>
                  <button onClick={() => setPkg(null)} className="text-mute hover:text-ink">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mb-4 rounded-lg bg-card-hi p-4 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-2xl font-bold">
                    <Coins className="size-5 text-gold" />
                    {total.toLocaleString("zh-CN")}
                    {pkg.bonus ? <span className="text-sm font-medium text-free">（含赠 {pkg.bonus}）</span> : null}
                  </p>
                  <p className="mt-1 text-sm text-dim">应付 ¥{pkg.price}</p>
                </div>
                <p className="mb-2 text-xs text-dim">支付方式</p>
                <div className="mb-4 grid grid-cols-3 gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "rounded-md border py-2 text-xs font-medium transition-colors",
                        method === m.id ? "border-accent bg-accent/8 text-accent" : "border-line text-dim hover:bg-card-hi",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={pay}
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-deep disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {pending ? "支付中…" : `确认支付 ¥${pkg.price}`}
                </button>
                <p className="mt-3 text-center text-[11px] text-mute">演示支付：真实支付网关（微信/支付宝）待接入，当前直接到账。</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
