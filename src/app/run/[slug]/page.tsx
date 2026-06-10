import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, LogOut, ShieldCheck } from "lucide-react";
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

      <RunSandbox slug={product.slug} entryUrl={product.entry.url} appName={product.name} />

      <p className="mt-3 text-center text-xs text-mute">
        其他应用入口为外部部署地址（开发者独立部署），此处演示用同源参考应用 {product.entry.url}
      </p>
    </main>
  );
}
