import Link from "next/link";
import { Pencil } from "lucide-react";
import { CapsuleArt } from "@/components/ui/capsule-art";
import { TypeBadge } from "@/components/ui/type-badge";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { listAllProductsAdmin } from "@/lib/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listAllProductsAdmin();
  const publishedCount = products.filter((p) => p.status === "published").length;
  const pendingCount = products.filter((p) => p.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3 text-sm text-dim">
        <span>共 {products.length} 个产品</span>
        <span>·</span>
        <span>已上架 {publishedCount}</span>
        {pendingCount > 0 && (
          <>
            <span>·</span>
            <span className="font-medium text-accent">待审核 {pendingCount}</span>
          </>
        )}
        <span>·</span>
        <span>精选 {products.filter((p) => p.featured).length}</span>
      </div>

      <div className="capsule divide-y divide-line">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2.5 sm:gap-4 sm:p-3">
            <Link href={`/admin/products/${p.id}`} className="shrink-0">
              <CapsuleArt
                art={{ hueA: p.hueA, hueB: p.hueB, icon: p.icon, capsuleUrl: p.capsuleUrl ?? undefined, bannerUrl: p.bannerUrl ?? undefined }}
                ratio="square"
                className="w-12 rounded-md sm:w-14"
                iconClassName="size-1/2"
              />
            </Link>

            <div className="min-w-0 grow">
              <div className="flex items-center gap-2">
                <Link href={`/admin/products/${p.id}`} className="truncate text-sm font-semibold hover:text-accent">
                  {p.name}
                </Link>
                <TypeBadge type={p.type} />
                {p.status === "published" ? (
                  <span className="rounded bg-free/10 px-1.5 py-0.5 text-[10px] font-medium text-free">已上架</span>
                ) : p.status === "pending" ? (
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">待审核</span>
                ) : (
                  <span className="rounded bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">草稿</span>
                )}
                {p.featured && (
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">精选</span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-mute">
                {p.developer} · {p.acquisitions.toLocaleString("zh-CN")} 获取 · {p.ratingScore.toFixed(1)} 分
                {p.priceCredits == null ? " · 免费" : ` · ${p.priceCredits} 点数`}
              </p>
            </div>

            <ProductRowActions id={p.id} status={p.status} featured={p.featured} />

            <Link
              href={`/admin/products/${p.id}`}
              className="flex shrink-0 items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-accent/50 hover:text-accent"
            >
              <Pencil className="size-3.5" />
              <span className="hidden sm:inline">编辑</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
