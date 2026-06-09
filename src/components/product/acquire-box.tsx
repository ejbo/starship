"use client";

import { useState } from "react";
import { Check, Download, Zap } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

/** 获取盒：价格 + 入库按钮（Phase 0 本地状态模拟） */
export function AcquireBox({ product }: { product: Product }) {
  const [acquired, setAcquired] = useState(false);
  const free = product.price === "free";

  return (
    <div className="capsule space-y-4 p-5 hover:translate-y-0">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-dim">{free ? "价格" : "解锁额度"}</span>
        {free ? (
          <span className="font-display text-lg font-bold text-teal">免费</span>
        ) : (
          <span className="flex items-center gap-1 font-display text-lg font-bold text-gold">
            <Zap className="size-4 fill-gold" />
            {(product.price as { credits: number }).credits} 星尘
          </span>
        )}
      </div>

      <button
        onClick={() => setAcquired((a) => !a)}
        className={cn(
          "w-full rounded-md py-2.5 text-sm font-semibold transition-all duration-200",
          acquired
            ? "border border-teal/40 bg-teal/10 text-teal"
            : "bg-gradient-to-r from-aurora to-teal text-abyss hover:shadow-[0_0_24px_-4px_rgb(83_216_255/.6)]",
        )}
      >
        {acquired ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-4" /> 已停泊在你的港湾
          </span>
        ) : (
          "添加到港湾"
        )}
      </button>

      <dl className="space-y-1.5 border-t border-line pt-3 text-xs text-dim">
        <div className="flex justify-between">
          <dt className="flex items-center gap-1">
            <Download className="size-3" /> 获取
          </dt>
          <dd className="font-display text-ink">{product.acquisitions.toLocaleString("zh-CN")}</dd>
        </div>
        <div className="flex justify-between">
          <dt>发布</dt>
          <dd>{product.releasedAt}</dd>
        </div>
        <div className="flex justify-between">
          <dt>最近更新</dt>
          <dd>{product.updatedAt}</dd>
        </div>
        <div className="flex justify-between">
          <dt>开发者</dt>
          <dd className="text-aurora">{product.developer}</dd>
        </div>
      </dl>
    </div>
  );
}
