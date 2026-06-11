"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Clock, Globe, Lock, Send } from "lucide-react";
import { submitForReviewAction, unlistAppAction, withdrawReviewAction } from "@/app/developer/actions";
import { cn } from "@/lib/cn";

export function ReviewStatus({ id, status: initial }: { id: string; status: string }) {
  const [status, setStatus] = useState(initial);
  const [pending, start] = useTransition();

  const run = (fn: (id: string) => Promise<void>, next: string) =>
    start(async () => {
      await fn(id);
      setStatus(next);
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        {status === "published" ? (
          <span className="flex items-center gap-1.5 text-free">
            <Globe className="size-4" /> 已上架 —— 商店可见
          </span>
        ) : status === "pending" ? (
          <span className="flex items-center gap-1.5 text-accent">
            <Clock className="size-4" /> 审核中 —— 等待平台审核
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-warn">
            <Lock className="size-4" /> 草稿 —— 仅你可见
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === "draft" && (
          <button
            onClick={() => run(submitForReviewAction, "pending")}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            <Send className="size-3.5" /> {pending ? "提交中…" : "提交审核"}
          </button>
        )}
        {status === "pending" && (
          <button
            onClick={() => run(withdrawReviewAction, "draft")}
            disabled={pending}
            className="rounded-md border border-line px-3.5 py-1.5 text-sm font-medium text-dim transition-colors hover:border-warn/40 hover:text-warn disabled:opacity-50"
          >
            {pending ? "处理中…" : "撤回"}
          </button>
        )}
        {status === "published" && (
          <button
            onClick={() => run(unlistAppAction, "draft")}
            disabled={pending}
            className="rounded-md border border-line px-3.5 py-1.5 text-sm font-medium text-dim transition-colors hover:border-warn/40 hover:text-warn disabled:opacity-50"
          >
            {pending ? "处理中…" : "下架为草稿"}
          </button>
        )}
      </div>

      {status === "pending" && (
        <p className="flex w-full items-center gap-1.5 text-xs text-mute">
          <CheckCircle2 className="size-3.5" /> 审核通过后将自动上架。审核期间仍可继续编辑。
        </p>
      )}
    </div>
  );
}
