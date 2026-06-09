import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Globe, ShieldCheck } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { describeCapability, getAllProducts, getBySlug } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getAllProducts())
    .filter((p) => p.entry)
    .map((p) => ({ slug: p.slug }));
}

/**
 * 沙箱启动页：应用由开发者独立部署，平台在此以 iframe/webview 沙箱加载其入口 URL，
 * 并注入 Platform SDK（身份、Gateway、存储、社交授权）。Phase 4 实装，当前为占位。
 */
export default async function RunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getBySlug(slug);
  if (!product || !product.entry) notFound();

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
        <span className="ml-auto flex items-center gap-1.5 text-xs text-free">
          <ShieldCheck className="size-3.5" /> 沙箱运行
        </span>
      </div>

      {/* 应用区域（Phase 4 实装 iframe 加载） */}
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-b-lg border border-t-0 border-line bg-card-hi/50 px-6 py-16 text-center">
        <CapsuleArt art={product.art} ratio="square" className="w-20 rounded-xl" iconClassName="size-1/2" />
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium text-ink">应用由 {product.developer} 独立部署</p>
          <p className="text-sm leading-relaxed text-dim">
            正式版中，这里将在沙箱中加载{" "}
            <span className="inline-flex items-center gap-1 rounded bg-card-hi px-1.5 py-0.5 text-xs text-dim">
              <Globe className="size-3" />
              {product.entry.url}
            </span>{" "}
            并注入 Platform SDK —— 应用经你的授权使用以下能力，但接触不到你的 API Key：
          </p>
        </div>
        <div className="flex max-w-md flex-wrap justify-center gap-1.5">
          {product.capabilities.map((cap) => (
            <span key={cap} className="rounded border border-line bg-panel px-2 py-1 text-xs text-dim">
              {describeCapability(cap).name}
            </span>
          ))}
        </div>
        <p className="text-xs text-mute">App Runtime 于 Phase 4 实装</p>
      </div>
    </main>
  );
}
