"use client";

import { useRef, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/app/p/[slug]/actions";
import { cn } from "@/lib/cn";

interface ReviewFormProps {
  slug: string;
  initial?: { score: number; body: string } | null;
}

export function ReviewForm({ slug, initial }: ReviewFormProps) {
  const [score, setScore] = useState(initial?.score ?? 5);
  const [hover, setHover] = useState(0);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("score", String(score));
        startTransition(async () => {
          await submitReviewAction(slug, fd);
          setDone(true);
        });
      }}
      className="capsule space-y-3 p-5"
    >
      <h3 className="text-sm font-semibold">{initial ? "更新你的评测" : "写一篇评测"}</h3>

      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 5 }, (_, i) => {
          const v = i + 1;
          const filled = (hover || score) >= v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setScore(v)}
              onMouseEnter={() => setHover(v)}
              aria-label={`${v} 星`}
              className="p-0.5"
            >
              <Star className={cn("size-6 transition-colors", filled ? "fill-star text-star" : "text-line")} />
            </button>
          );
        })}
        <span className="ml-1 text-sm text-dim">{score} 星</span>
      </div>

      <textarea
        name="body"
        required
        defaultValue={initial?.body ?? ""}
        rows={3}
        placeholder="说说你的真实体验……"
        onChange={() => setDone(false)}
        className="w-full resize-y rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
        >
          {pending ? "提交中…" : initial ? "更新评测" : "发布评测"}
        </button>
        {done && <span className="text-sm text-free">已保存 ✓</span>}
      </div>
    </form>
  );
}
