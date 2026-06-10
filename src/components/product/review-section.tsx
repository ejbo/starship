import { Clock, ThumbsDown, ThumbsUp } from "lucide-react";
import { HelpfulButton } from "@/components/product/helpful-button";
import { Avatar } from "@/components/ui/avatar";
import { ratingVerdict } from "@/components/ui/rating";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

/** 评测直方图：近 10 期好评率 */
function RatingHistogram({ histogram }: { histogram: number[] }) {
  return (
    <div className="flex h-16 items-end gap-1">
      {histogram.map((v, i) => (
        <div
          key={i}
          title={`第 ${i + 1} 期好评率 ${v}%`}
          className={cn("flex-1 rounded-sm", v >= 85 ? "bg-accent/60" : v >= 70 ? "bg-warn/50" : "bg-danger/50")}
          style={{ height: `${Math.max(8, v)}%` }}
        />
      ))}
    </div>
  );
}

export function ReviewSection({ product }: { product: Product }) {
  const verdict = ratingVerdict(product.rating.score);
  const positiveRate = product.rating.histogram.length
    ? Math.round(product.rating.histogram.reduce((a, b) => a + b, 0) / product.rating.histogram.length)
    : Math.round((product.rating.score / 5) * 100);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">用户评测</h2>

      {/* 总评卡（Steam 式好评率） */}
      <div className="capsule grid gap-4 p-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <p className="text-lg font-bold">
            <span className={verdict.tone === "good" ? "text-good" : verdict.tone === "mixed" ? "text-warn" : "text-danger"}>
              {verdict.label}
            </span>
          </p>
          <p className="text-sm text-dim">
            {product.rating.count.toLocaleString("zh-CN")} 篇评测中 <span className="font-semibold text-good">{positiveRate}%</span> 为好评
          </p>
          <p className="text-xs text-mute">评测权重按使用时长加权 —— 重度用户的声音更响。</p>
        </div>
        <div className="w-full sm:w-48">
          <RatingHistogram histogram={product.rating.histogram} />
          <p className="mt-1 text-center text-[10px] text-mute">近 10 期好评率走势</p>
        </div>
      </div>

      {/* 评测列表 */}
      <div className="space-y-3">
        {product.reviews.map((review, i) => {
          const recommended = review.score >= 4;
          return (
            <article key={review.id ?? i} className="capsule p-5">
              <div className="mb-2.5 flex items-center gap-3">
                <Avatar name={review.author} hue={review.avatarHue} size="sm" isAgent={review.isAgent} />
                <div className="leading-tight">
                  <p className="text-sm font-medium">{review.author}</p>
                  <p className="flex items-center gap-1 text-[11px] text-mute">
                    <Clock className="size-3" /> 使用 {review.usageHours} 小时
                  </p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                      recommended ? "bg-accent/8 text-accent" : "bg-danger/8 text-danger",
                    )}
                  >
                    {recommended ? <ThumbsUp className="size-3" /> : <ThumbsDown className="size-3" />}
                    {recommended ? "推荐" : "不推荐"}
                  </span>
                  <p className="text-[11px] text-mute">{review.date}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink/90">{review.body}</p>
              {review.id ? (
                <HelpfulButton reviewId={review.id} initial={review.helpful} />
              ) : (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-dim">
                  <ThumbsUp className="size-3" /> 有价值 ({review.helpful})
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
