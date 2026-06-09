"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Download, Loader2, Play, Plus } from "lucide-react";
import { acquireAction, removeAction } from "@/app/p/[slug]/actions";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

interface AcquireBoxProps {
  product: Product;
  acquired: boolean;
  /** 未登录时为 true：按钮引导去登录 */
  signedOut?: boolean;
}

/** 获取盒：价格 + 入库/移除（真实写库）；应用入库后可启动 */
export function AcquireBox({ product, acquired, signedOut }: AcquireBoxProps) {
  const [isAcquired, setIsAcquired] = useState(acquired);
  const [pending, startTransition] = useTransition();
  const free = product.price === "free";

  const toggle = () => {
    startTransition(async () => {
      if (isAcquired) {
        await removeAction(product.slug);
        setIsAcquired(false);
      } else {
        await acquireAction(product.slug);
        setIsAcquired(true);
      }
    });
  };

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

      {signedOut ? (
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-accent-deep"
        >
          登录后添加至库
        </Link>
      ) : (
        <button
          onClick={toggle}
          disabled={pending}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-medium transition-colors disabled:opacity-60",
            isAcquired
              ? "border border-free/40 bg-free/8 text-free hover:border-danger/40 hover:bg-danger/8 hover:text-danger"
              : "bg-accent text-white hover:bg-accent-deep",
          )}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isAcquired ? (
            <>
              <Check className="size-4" /> 已在库中
            </>
          ) : (
            <>
              <Plus className="size-4" /> 添加至库
            </>
          )}
        </button>
      )}

      {isAcquired && !signedOut && product.entry && (
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
