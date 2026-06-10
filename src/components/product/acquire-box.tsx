"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Coins, Download, Loader2, Play, Plus } from "lucide-react";
import { acquireAction, removeAction } from "@/app/p/[slug]/actions";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/types";

interface AcquireBoxProps {
  product: Product;
  acquired: boolean;
  signedOut?: boolean;
  /** 当前用户点数余额（用于付费购买） */
  credits?: number;
}

/** 获取盒：免费入库 / 付费购买（扣点数）；拥有后可启动 */
export function AcquireBox({ product, acquired, signedOut, credits = 0 }: AcquireBoxProps) {
  const [isAcquired, setIsAcquired] = useState(acquired);
  const [balance, setBalance] = useState(credits);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const free = product.price === "free";
  const price = free ? 0 : (product.price as { credits: number }).credits;
  const canAfford = free || balance >= price;

  const act = () => {
    setError(null);
    startTransition(async () => {
      if (isAcquired) {
        await removeAction(product.slug);
        setIsAcquired(false);
        if (price > 0) setBalance((b) => b + price); // 退款
      } else {
        const res = await acquireAction(product.slug);
        if (res.ok) {
          setIsAcquired(true);
          if (price > 0) setBalance((b) => b - price);
        } else {
          setError(res.error ?? "失败");
        }
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
          <span className="flex items-center gap-1 font-semibold text-ink">
            <Coins className="size-4 text-gold" /> {price} 点数
          </span>
        )}
      </div>

      {signedOut ? (
        <Link
          href="/login"
          className="block w-full rounded-md bg-accent py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-accent-deep"
        >
          登录后{free ? "添加" : "购买"}
        </Link>
      ) : (
        <>
          <button
            onClick={act}
            disabled={pending || (!isAcquired && !canAfford)}
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
            ) : free ? (
              <>
                <Plus className="size-4" /> 添加至库
              </>
            ) : (
              <>
                <Coins className="size-4" /> 购买（{price} 点数）
              </>
            )}
          </button>
          {!free && (
            <p className="-mt-2 text-center text-[11px] text-mute">
              余额 {balance.toLocaleString("zh-CN")} 点数{!canAfford && !isAcquired && " · 不足"}
            </p>
          )}
          {error && <p className="-mt-2 text-center text-xs text-danger">{error}</p>}
        </>
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
