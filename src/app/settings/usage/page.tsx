import { Coins, Database, Layers } from "lucide-react";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { UsageBars } from "@/components/settings/usage-bars";
import { getAllProducts } from "@/lib/catalog";
import { providerMeta } from "@/lib/providers";
import { formatCost, formatTokens, getUsageSummary } from "@/lib/usage-service";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const [summary, products] = await Promise.all([getUsageSummary(), getAllProducts()]);
  const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));

  const stats = [
    { icon: Database, label: "本期总消耗", value: `${formatTokens(summary.totalTokens)} tokens` },
    { icon: Coins, label: "本期成本", value: formatCost(summary.totalCostCents) },
    { icon: Layers, label: "调用记录", value: `${summary.recordCount} 条` },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">设置</h1>
      </header>
      <SettingsTabs />

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-dim">
        你的 AI 开销按应用、Provider 拆解一目了然。给每个应用设日限额，就像给游戏限时一样给 AI 限流。
      </p>

      {/* 总览卡 */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="capsule p-4">
            <Icon className="mb-1.5 size-4 text-accent/70" />
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-mute">{label}</p>
          </div>
        ))}
      </div>

      {/* 走势 */}
      <div className="mb-6">
        <UsageBars title="按日走势" rows={summary.byDay} hue={160} />
      </div>

      {/* 拆解 */}
      <div className="grid gap-6 md:grid-cols-2">
        <UsageBars
          title="按应用"
          rows={summary.byApp}
          labelOf={(slug) => nameBySlug.get(slug) ?? slug}
          hue={217}
        />
        <UsageBars
          title="按 Provider"
          rows={summary.byProvider}
          labelOf={(id) => providerMeta(id).name}
          hue={280}
        />
      </div>

      {/* 最近记录 */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">最近调用</h2>
        <div className="capsule overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-mute">
                <th className="px-4 py-2.5 font-medium">日期</th>
                <th className="px-4 py-2.5 font-medium">应用</th>
                <th className="px-4 py-2.5 font-medium">模型</th>
                <th className="px-4 py-2.5 text-right font-medium">Tokens</th>
                <th className="px-4 py-2.5 text-right font-medium">成本</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent.map((r, i) => (
                <tr key={i} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 text-mute">{r.day}</td>
                  <td className="px-4 py-2.5 font-medium">{nameBySlug.get(r.productSlug) ?? r.productSlug}</td>
                  <td className="px-4 py-2.5 text-dim">{r.model}</td>
                  <td className="px-4 py-2.5 text-right">{formatTokens(r.tokens)}</td>
                  <td className="px-4 py-2.5 text-right text-dim">{formatCost(r.costCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
