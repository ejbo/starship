"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Download, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

/** 获取盒：价格 + 入库按钮（Phase 0 本地状态模拟）；应用入库后可启动 */
export function AcquireBox({ product }: { product: Product }) {
  const [acquired, setAcquired] = useState(false);
  const free = product.price === "free";

  return (
    <div className="capsule space-y-4 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-dim">{free ? "价格" : "解锁"}</span>
        {free ? (
          <span className="font-semibold text-free">免费</span>
        ) : (
          <span className="font-semibold text-ink">
            {(product.price as { credits: number }).credits} 点数
          </span>
        )}
      </div>

      <button
        onClick={() => setAcquired((a) => !a)}
        className={cn(
          "w-full rounded-md py-2.5 text-sm font-medium transition-colors",
          acquired
            ? "border border-free/40 bg-free/8 text-free"
            : "bg-accent text-white hover:bg-accent-deep",
        )}
      >
        {acquired ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-4" /> 已在库中
          </span>
        ) : (
          "添加至库"
        )}
      </button>

      {acquired && product.entry && (
        <Link
          href={`/run/${product.slug}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/40 bg-accent/8 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
        >
          <Play className="size-4" /> 启动应用
        </Link>
      )}

      <dl className="space-y-1.5 border-t border-line pt-3 text-xs text-dim">
        <div className="flex justify-between">
          <dt className="flex items-center gap-1">
            <Download className="size-3" /> 获取
          </dt>
          <dd className="text-ink">{product.acquisitions.toLocaleString("zh-CN")}</dd>
        </div>
        {product.version && (
          <div className="flex justify-between">
            <dt>当前版本</dt>
            <dd className="text-ink">{product.version}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>发布</dt>
          <dd>{product.releasedAt}</dd>
        </div>
        <div className="flex justify-between">
          <dt>最近更新</dt>
          <dd>{product.updatedAt}</dd>
        </div>
        <div className="flex justify-between">
          <dt>发布者</dt>
          <dd className="text-accent">{product.developer}</dd>
        </div>
      </dl>
    </div>
  );
}
