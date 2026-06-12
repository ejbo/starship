import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Coins, RotateCcw, TrendingUp, Zap } from "lucide-react";
import { TopUpPanel } from "@/components/wallet/topup-panel";
import { TokenExchangePanel } from "@/components/wallet/token-exchange-panel";
import { getBalance, getMyTokens, getTransactions, TOKENS_PER_CREDIT } from "@/lib/credits-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const kindMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  topup: { label: "充值", icon: ArrowDownLeft, cls: "text-free" },
  token_exchange: { label: "兑换 Token", icon: Zap, cls: "text-ink" },
  purchase: { label: "购买", icon: ArrowUpRight, cls: "text-ink" },
  refund: { label: "退款", icon: RotateCcw, cls: "text-free" },
  earning: { label: "收益分成", icon: TrendingUp, cls: "text-free" },
};

export default async function WalletPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const [balance, tokens, txns] = await Promise.all([getBalance(), getMyTokens(), getTransactions()]);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold">钱包</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="capsule bg-gradient-to-br from-accent/[0.06] to-purple/[0.05] p-6">
          <p className="text-sm text-dim">点数余额</p>
          <p className="mt-1 flex items-center gap-2 text-4xl font-bold">
            <Coins className="size-7 text-gold" />
            {balance.toLocaleString("zh-CN")}
          </p>
          <p className="mt-1.5 text-xs text-mute">点数用于获取付费应用、模型与 Agent。</p>
        </div>
        <div className="capsule bg-gradient-to-br from-warn/[0.06] to-accent/[0.05] p-6">
          <p className="text-sm text-dim">Token 余额</p>
          <p className="mt-1 flex items-center gap-2 text-4xl font-bold">
            <Zap className="size-7 text-warn" />
            {tokens.toLocaleString("zh-CN")}
          </p>
          <p className="mt-1.5 text-xs text-mute">经平台调模型时按用量消耗，在原生应用（如 MultiLLM）中同步。</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">充值点数</h2>
        <TopUpPanel />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-bold">兑换 Token</h2>
        <p className="mb-3 text-sm text-dim">用点数兑换 Gateway token（1 点数 = {TOKENS_PER_CREDIT.toLocaleString("zh-CN")} token）。</p>
        <TokenExchangePanel tokensPerCredit={TOKENS_PER_CREDIT} credits={balance} />
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
