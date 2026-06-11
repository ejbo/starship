"use client";
import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFeaturedAction, togglePublishedAction } from "@/app/admin/actions";
import { cn } from "@/lib/cn";

export function ProductRowActions({ id, published, featured }: { id: string; published: boolean; featured: boolean }) {
  const [pub, setPub] = useState(published);
  const [feat, setFeat] = useState(featured);
  const [pending, start] = useTransition();

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
        className={cn(
          "rounded-md p-1.5 transition-colors disabled:opacity-50",
          feat ? "text-accent" : "text-mute hover:text-accent",
        )}
      >
        <Star className={cn("size-4", feat && "fill-current")} />
      </button>

      <button
        disabled={pending}
        onClick={() => {
          const v = !pub;
          setPub(v);
          start(() => togglePublishedAction(id, v));
        }}
        className={cn(
          "w-14 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
          pub
            ? "border-line text-dim hover:border-danger/50 hover:text-danger"
            : "border-free/40 bg-free/10 text-free hover:bg-free/15",
        )}
      >
        {pub ? "下架" : "上架"}
      </button>
    </div>
  );
}
