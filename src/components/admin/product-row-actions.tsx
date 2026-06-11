"use client";
import { useState, useTransition } from "react";
import { Check, Star, X } from "lucide-react";
import { toggleFeaturedAction, togglePublishedAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

export function ProductRowActions({ id, status: initial, featured }: { id: string; status: string; featured: boolean }) {
  const [status, setStatus] = useState(initial);
  const [feat, setFeat] = useState(featured);
  const [pending, start] = useTransition();

  const setPublished = (v: boolean) => {
    setStatus(v ? "published" : "draft");
    start(() => togglePublishedAction(id, v));
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        title={feat ? "取消精选" : "设为精选"}
        disabled={pending}
        onClick={() => {
          const v = !feat;
          setFeat(v);
          start(() => toggleFeaturedAction(id, v));
        }}
        className={cn("rounded-md p-1.5 transition-colors disabled:opacity-50", feat ? "text-accent" : "text-mute hover:text-accent")}
      >
        <Star className={cn("size-4", feat && "fill-current")} />
      </button>

      {status === "pending" ? (
        <>
          <button
            disabled={pending}
            onClick={() => setPublished(true)}
            className="flex items-center gap-1 rounded-md border border-free/40 bg-free/10 px-2 py-1.5 text-xs font-medium text-free transition-colors hover:bg-free/15 disabled:opacity-50"
          >
            <Check className="size-3.5" /> 通过
          </button>
          <button
            disabled={pending}
            onClick={() => setPublished(false)}
            className="flex items-center gap-1 rounded-md border border-line px-2 py-1.5 text-xs font-medium text-dim transition-colors hover:border-danger/50 hover:text-danger disabled:opacity-50"
          >
            <X className="size-3.5" /> 驳回
          </button>
        </>
      ) : (
        <button
          disabled={pending}
          onClick={() => setPublished(status !== "published")}
          className={cn(
            "w-14 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
            status === "published"
              ? "border-line text-dim hover:border-danger/50 hover:text-danger"
              : "border-free/40 bg-free/10 text-free hover:bg-free/15",
          )}
        >
          {status === "published" ? "下架" : "上架"}
        </button>
      )}
    </div>
  );
}
