import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * 顶部大活动 banner（仿 Steam 季节促销横幅）。当前为平台首发季默认内容；
 * 后续接入管理员后台后改为可编辑（标题/副标题/图片/链接/时间）。
 */
export function PromoBanner() {
  return (
    <Link
      href="/#featured"
      className="group relative block aspect-[21/7] overflow-hidden rounded-xl shadow-sm"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=1920&q=75&auto=format&fit=crop"
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1d2bbd]/92 via-[#3454e0]/70 to-[#7c5cd6]/55" />
      <div className="absolute inset-0 flex flex-col justify-center gap-3 px-6 text-white sm:px-12">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          <Sparkles className="size-3.5" />
          限时 · 即日起至 6 月 30 日
        </span>
        <h2 className="font-display text-3xl font-black leading-none tracking-tight drop-shadow sm:text-5xl">
          星港首发季
        </h2>
        <p className="max-w-md text-sm text-white/85 sm:text-base">
          应用 · 模型 · Agent · Skill · 教程 · 视频，一站直达。新作上架、限时点数、精选推荐。
        </p>
        <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-semibold text-ink transition-transform group-hover:translate-x-0.5">
          立即探索
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}
