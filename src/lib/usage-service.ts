import "server-only";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export interface UsageBreakdown {
  key: string;
  tokens: number;
  costCents: number;
}

export interface UsageSummary {
  totalTokens: number;
  totalCostCents: number;
  recordCount: number;
  byApp: UsageBreakdown[];
  byProvider: UsageBreakdown[];
  byDay: UsageBreakdown[];
  recent: {
    productSlug: string;
    provider: string;
    model: string;
    tokens: number;
    costCents: number;
    day: string;
  }[];
}

export async function getUsageSummary(): Promise<UsageSummary> {
  const userId = await getSessionUserId();
  const records = await prisma.usageRecord.findMany({
    where: { userId },
    orderBy: { day: "desc" },
  });

  let totalTokens = 0;
  let totalCostCents = 0;
  const apps = new Map<string, UsageBreakdown>();
  const provs = new Map<string, UsageBreakdown>();
  const days = new Map<string, UsageBreakdown>();

  for (const r of records) {
    const tokens = r.tokensIn + r.tokensOut;
    totalTokens += tokens;
    totalCostCents += r.costCents;
    accumulate(apps, r.productSlug, tokens, r.costCents);
    accumulate(provs, r.provider, tokens, r.costCents);
    accumulate(days, r.day, tokens, r.costCents);
  }

  return {
    totalTokens,
    totalCostCents,
    recordCount: records.length,
    byApp: [...apps.values()].sort((a, b) => b.tokens - a.tokens),
    byProvider: [...provs.values()].sort((a, b) => b.tokens - a.tokens),
    byDay: [...days.values()].sort((a, b) => a.key.localeCompare(b.key)),
    recent: records.slice(0, 12).map((r) => ({
      productSlug: r.productSlug,
      provider: r.provider,
      model: r.model,
      tokens: r.tokensIn + r.tokensOut,
      costCents: r.costCents,
      day: r.day,
    })),
  };
}

function accumulate(map: Map<string, UsageBreakdown>, key: string, tokens: number, costCents: number) {
  const cur = map.get(key) ?? { key, tokens: 0, costCents: 0 };
  cur.tokens += tokens;
  cur.costCents += costCents;
  map.set(key, cur);
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
