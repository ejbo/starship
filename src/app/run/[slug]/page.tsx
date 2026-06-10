import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ExternalLink, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { RunSandbox } from "@/components/runtime/run-sandbox";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { describeCapability, getBySlug } from "@/lib/catalog";
import { setActivity } from "@/lib/friends-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * App Runtime 启动页：应用由开发者独立部署，平台在沙箱 iframe 中加载其入口 URL，
 * 经 postMessage 注入 Platform SDK（身份、Gateway、存储）。见 RunSandbox。
 */
export default async function RunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const product = await getBySlug(slug);
  if (!product || !product.entry) notFound();

  // 上报正在使用的应用，反哺好友在线状态
  await setActivity(product.name);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      {/* 应用标题栏 */}
      <div className="flex flex-wrap items-center gap-3 rounded-t-lg border border-line bg-panel px-4 py-3">
        <Link
          href={`/p/${product.slug}`}
          className="flex items-center gap-1 text-xs text-dim transition-colors hover:text-accent"
        >
          <ChevronLeft className="size-3.5" /> 详情页
        </Link>
        <span className="h-4 w-px bg-line" />
        <CapsuleArt art={product.art} ratio="square" className="w-7 rounded" iconClassName="size-1/2" />
        <span className="text-sm font-semibold">{product.name}</span>
        <span className="text-xs text-mute">
          {product.developer} · {product.version}
        </span>
        <span className="ml-3 hidden items-center gap-1.5 sm:flex">
          {product.capabilities.map((cap) => (
            <span key={cap} className="rounded border border-line bg-page px-1.5 py-0.5 text-[11px] text-mute">
              {describeCapability(cap).name}
            </span>
          ))}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-free">
          <ShieldCheck className="size-3.5" /> 沙箱运行 · Key 不出平台
        </span>
        <Link
          href="/library"
          className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs text-dim transition-colors hover:border-danger/40 hover:text-danger"
          title="退出应用，返回库"
        >
          <LogOut className="size-3.5" /> 退出
        </Link>
      </div>

      {product.entry.launchMode === "newtab" ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 rounded-b-lg border border-t-0 border-line bg-card-hi/40 px-6 py-16 text-center">
          <CapsuleArt art={product.art} ratio="square" className="w-20 rounded-2xl" iconClassName="size-1/2" />
          <div className="max-w-md space-y-2">
            <p className="text-lg font-semibold">{product.name}</p>
            <p className="text-sm leading-relaxed text-dim">
              这是一个独立 web 应用，将在<b>新标签页</b>中打开。它通过「使用平台密钥」授权，复用你在配置中心的模型密钥——换应用无需重配。
            </p>
          </div>
          <a
            href={product.entry.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            <ExternalLink className="size-4" /> 在新标签页打开应用
          </a>
          <p className="flex items-center gap-1.5 text-xs text-mute">
            <KeyRound className="size-3.5" /> 应用经 OAuth 授权后调用平台 Gateway，密钥不出平台
          </p>
          <p className="text-[11px] text-mute">入口：{product.entry.url}</p>
        </div>
      ) : (
        <>
          <RunSandbox slug={product.slug} entryUrl={product.entry.url} appName={product.name} />
          <p className="mt-3 text-center text-xs text-mute">
            沙箱内运行，经 postMessage SDK 与平台通信；演示用同源参考应用 {product.entry.url}
          </p>
        </>
      )}
    </main>
  );
}
