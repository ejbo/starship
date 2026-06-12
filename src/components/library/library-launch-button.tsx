"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Play } from "lucide-react";
import { launchAppAction } from "@/app/p/[slug]/actions";

/**
 * 库详情页启动按钮：newtab 应用直接开新标签页（同步开空白页保住手势 → 回填地址，绕过拦截）
 * 并上报「正在使用」；embedded 沙箱应用进 /run 容器。
 */
export function LibraryLaunchButton({ slug, launchMode }: { slug: string; launchMode: "newtab" | "embedded" }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const launch = () => {
    setErr(null);
    if (launchMode === "newtab") {
      const w = window.open("", "_blank");
      start(async () => {
        const res = await launchAppAction(slug);
        if (res.ok && res.url) {
          if (w) w.location.href = res.url;
          else window.location.href = res.url;
        } else {
          if (w) w.close();
          setErr(res.error ?? "启动失败");
        }
      });
    } else {
      start(async () => {
        await launchAppAction(slug); // 上报正在使用
        router.push(`/run/${slug}`);
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={launch}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-free px-8 py-2.5 text-base font-semibold text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : launchMode === "newtab" ? (
          <ExternalLink className="size-5" />
        ) : (
          <Play className="size-5 fill-white" />
        )}
        {pending ? "正在打开…" : "启动"}
      </button>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}
