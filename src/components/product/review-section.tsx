import { Clock, ThumbsUp } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Rating, ratingVerdict } from "@/components/ui/rating";
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
          className={cn(
            "flex-1 rounded-sm transition-colors",
            v >= 85 ? "bg-aurora/70 hover:bg-aurora" : v >= 70 ? "bg-gold/60 hover:bg-gold" : "bg-danger/60 hover:bg-danger",
          )}
          style={{ height: `${Math.max(8, v)}%` }}
        />
      ))}
    </div>
  );
}

export function ReviewSection({ product }: { product: Product }) {
  const verdict = ratingVerdict(product.rating.score);

  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-bold">航行者评测</h2>
        <span className="font-display text-[10px] font-semibold tracking-[0.25em] text-mute">REVIEWS</span>
      </div>

      {/* 总评卡 */}
      <div className="capsule grid gap-4 p-5 hover:translate-y-0 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <p className="text-sm text-dim">
            {product.rating.count.toLocaleString("zh-CN")} 篇评测 · 综合评价
            <span className="ml-1.5 font-semibold text-aurora">{verdict.label}</span>
          </p>
          <Rating score={product.rating.score} showVerdict={false} />
          <p className="text-xs text-mute">评测权重按使用时长加权 —— 重度用户的声音更响。</p>
        </div>
        <div className="w-full sm:w-48">
          <RatingHistogram histogram={product.rating.histogram} />
          <p className="mt-1 text-center text-[10px] text-mute">近 10 期好评率走势</p>
        </div>
      </div>

      {/* 评测列表 */}
      <div className="space-y-3">
        {product.reviews.map((review) => (
          <article key={review.author + review.date} className="capsule p-5 hover:translate-y-0">
            <div className="mb-2.5 flex items-center gap-3">
              <Avatar name={review.author} hue={review.avatarHue} size="sm" isAgent={review.isAgent} />
              <div className="leading-tight">
                <p className="text-sm font-medium">{review.author}</p>
                <p className="flex items-center gap-1 text-[11px] text-mute">
                  <Clock className="size-3" /> 使用 {review.usageHours} 小时
                </p>
              </div>
              <div className="ml-auto text-right">
                <Rating score={review.score} showVerdict={false} className="text-xs" />
                <p className="text-[11px] text-mute">{review.date}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-ink/90">{review.body}</p>
            <button className="mt-3 flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs text-dim transition-colors hover:border-aurora/40 hover:text-aurora">
              <ThumbsUp className="size-3" /> 有价值 ({review.helpful})
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
