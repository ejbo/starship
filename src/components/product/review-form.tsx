"use client";

import { useRef, useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { submitReviewAction } from "@/app/p/[slug]/actions";
import { cn } from "@/lib/cn";

interface ReviewFormProps {
  slug: string;
  initial?: { score: number; body: string } | null;
}

/** Steam 式评测：推荐 / 不推荐 + 正文 */
export function ReviewForm({ slug, initial }: ReviewFormProps) {
  const [recommend, setRecommend] = useState<boolean>(initial ? initial.score >= 4 : true);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set("recommend", recommend ? "yes" : "no");
        startTransition(async () => {
          await submitReviewAction(slug, fd);
          setDone(true);
        });
      }}
      className="capsule space-y-3 p-5"
    >
      <h3 className="text-sm font-semibold">{initial ? "更新你的评测" : "你推荐这个造物吗？"}</h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setRecommend(true); setDone(false); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors",
            recommend ? "border-accent bg-accent/8 text-accent" : "border-line text-dim hover:bg-card-hi",
          )}
        >
          <ThumbsUp className="size-4" /> 推荐
        </button>
        <button
          type="button"
          onClick={() => { setRecommend(false); setDone(false); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-sm font-medium transition-colors",
            !recommend ? "border-danger bg-danger/8 text-danger" : "border-line text-dim hover:bg-card-hi",
          )}
        >
          <ThumbsDown className="size-4" /> 不推荐
        </button>
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
