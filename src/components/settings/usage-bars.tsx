import { cn } from "@/lib/cn";
import { formatCost, formatTokens, type UsageBreakdown } from "@/lib/usage-service";

interface UsageBarsProps {
  title: string;
  rows: UsageBreakdown[];
  /** key → 展示名 */
  labelOf?: (key: string) => string;
  hue?: number;
}

/** 横向条形：按 token 占比 */
export function UsageBars({ title, rows, labelOf, hue = 217 }: UsageBarsProps) {
  const max = Math.max(1, ...rows.map((r) => r.tokens));
  return (
    <div className="capsule p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2.5">
        {rows.map((row, i) => (
          <li key={row.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="truncate font-medium text-ink">{labelOf ? labelOf(row.key) : row.key}</span>
              <span className="ml-2 shrink-0 text-mute">
                {formatTokens(row.tokens)} · {formatCost(row.costCents)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-card-hi">
              <div
                className={cn("h-full rounded-full")}
                style={{
                  width: `${(row.tokens / max) * 100}%`,
                  background: `hsl(${hue} ${68 - i * 6}% ${58 + i * 3}%)`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
