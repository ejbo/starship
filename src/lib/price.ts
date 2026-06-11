/** 折后实付价：floor(原价 × (100-折扣)/100)。折扣 clamp 到 0-90。 */
export function effectivePrice(original: number, discountPct: number): number {
  const pct = Math.max(0, Math.min(90, discountPct || 0));
  return pct > 0 ? Math.floor((original * (100 - pct)) / 100) : original;
}

/** DB 价格字段 → 视图 price（含折扣信息） */
export function priceView(
  credits: number | null,
  discountPct: number,
): "free" | { credits: number; original?: number; discountPct?: number } {
  if (credits == null) return "free";
  const pct = Math.max(0, Math.min(90, discountPct || 0));
  if (pct > 0) return { credits: effectivePrice(credits, pct), original: credits, discountPct: pct };
  return { credits };
}
