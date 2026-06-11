"use client";

import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { submitReviewAction } from "@/app/p/[slug]/actions";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/cn";

interface ReviewFormProps {
  slug: string;
  initial?: { score: number; body: string } | null;
}

/** Steam 式评测：推荐 / 不推荐 + 富文本正文（Markdown） */
export function ReviewForm({ slug, initial }: ReviewFormProps) {
  const [recommend, setRecommend] = useState<boolean>(initial ? initial.score >= 4 : true);
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    if (!body.trim()) {
      setErr("评测内容不能为空");
      return;
    }
    setErr(null);
    const fd = new FormData();
    fd.set("recommend", recommend ? "yes" : "no");
    fd.set("body", body);
    startTransition(async () => {
      await submitReviewAction(slug, fd);
      setDone(true);
    });
  }

  return (
    <div className="capsule space-y-3 p-5">
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

      <RichTextEditor
        value={body}
        onChange={(md) => { setBody(md); setDone(false); setErr(null); }}
        placeholder="说说你的真实体验……支持加粗、列表、引用、链接等"
        ariaLabel="评测正文"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
        >
          {pending ? "提交中…" : initial ? "更新评测" : "发布评测"}
        </button>
        {err && <span className="text-sm text-danger">{err}</span>}
        {done && <span className="text-sm text-free">已保存 ✓</span>}
      </div>
    </div>
  );
}
