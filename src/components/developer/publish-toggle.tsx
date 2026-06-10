"use client";

import { useState, useTransition } from "react";
import { Globe, Lock } from "lucide-react";
import { setPublishedAction } from "@/app/developer/actions";
import { cn } from "@/lib/cn";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [isPublished, setIsPublished] = useState(published);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        {isPublished ? (
          <span className="flex items-center gap-1.5 text-free">
            <Globe className="size-4" /> 已发布 —— 在商店可见
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-warn">
            <Lock className="size-4" /> 草稿 —— 仅你可见
          </span>
        )}
      </div>
      <button
        onClick={() =>
          startTransition(async () => {
            await setPublishedAction(id, !isPublished);
            setIsPublished((p) => !p);
          })
        }
        disabled={pending}
        className={cn(
          "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
          isPublished
            ? "border border-line text-dim hover:border-warn/40 hover:text-warn"
            : "bg-accent text-white hover:bg-accent-deep",
        )}
      >
        {pending ? "处理中…" : isPublished ? "下架为草稿" : "发布到商店"}
      </button>
    </div>
  );
}
