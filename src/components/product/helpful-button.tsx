"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { markHelpfulAction } from "@/app/p/[slug]/actions";
import { cn } from "@/lib/cn";

/** 「有价值」投票（每人每条一次，真实写库） */
export function HelpfulButton({ reviewId, initial }: { reviewId: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [voted, setVoted] = useState(false);
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() => {
        if (voted) return;
        start(async () => {
          const n = await markHelpfulAction(reviewId);
          setCount(n);
          setVoted(true);
        });
      }}
      disabled={pending || voted}
      className={cn(
        "mt-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
        voted ? "border-accent/50 bg-accent/8 text-accent" : "border-line text-dim hover:border-accent/50 hover:text-accent",
      )}
    >
      <ThumbsUp className="size-3" /> 有价值 ({count}){voted && " ✓"}
    </button>
  );
}
