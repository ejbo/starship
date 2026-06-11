import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Coins, RotateCcw } from "lucide-react";
import { TopUpPanel } from "@/components/wallet/topup-panel";
import { getBalance, getTransactions } from "@/lib/credits-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const kindMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  topup: { label: "充值", icon: ArrowDownLeft, cls: "text-free" },
  purchase: { label: "购买", icon: ArrowUpRight, cls: "text-ink" },
  refund: { label: "退款", icon: RotateCcw, cls: "text-free" },
};

export default async function WalletPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const [balance, txns] = await Promise.all([getBalance(), getTransactions()]);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold">钱包</h1>

      <div className="capsule mb-8 bg-gradient-to-br from-accent/[0.06] to-purple/[0.05] p-6">
        <p className="text-sm text-dim">点数余额</p>
        <p className="mt-1 flex items-center gap-2 text-4xl font-bold">
          <Coins className="size-7 text-gold" />
          {balance.toLocaleString("zh-CN")}
        </p>
        <p className="mt-1.5 text-xs text-mute">点数用于获取付费应用、模型与 Agent。</p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">充值</h2>
        <TopUpPanel />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">交易记录</h2>
        {txns.length === 0 ? (
          <p className="capsule p-10 text-center text-sm text-dim">还没有交易记录。</p>
        ) : (
          <div className="capsule divide-y divide-line">
            {txns.map((t) => {
              const m = kindMeta[t.kind] ?? kindMeta.purchase;
              const Icon = m.icon;
              const positive = t.amount > 0;
              return (
                <div key={t.id} className="flex items-center gap-3 p-3.5">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${positive ? "bg-free/10 text-free" : "bg-card-hi text-dim"}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 grow">
                    <p className="text-sm font-medium">
                      {m.label}
                      {t.productSlug ? <span className="text-dim"> · {t.productSlug}</span> : null}
                    </p>
                    <p className="text-xs text-mute">{t.createdAt.slice(0, 16).replace("T", " ")}{t.method && t.method !== "demo" ? ` · ${t.method}` : ""}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${positive ? "text-free" : "text-ink"}`}>
                    {positive ? "+" : ""}{t.amount.toLocaleString("zh-CN")}
                  </span>
                  <span className="hidden shrink-0 text-xs text-mute sm:block">余 {t.balanceAfter.toLocaleString("zh-CN")}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
