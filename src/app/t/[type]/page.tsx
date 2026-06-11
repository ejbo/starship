import { notFound } from "next/navigation";
import { ProductCard } from "@/components/store/product-card";
import { typeMeta } from "@/components/ui/type-badge";
import { getByType } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: ProductType[] = ["app", "model", "agent", "skill", "tutorial", "video"];

export default async function BrowseByTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPES.includes(type as ProductType)) notFound();
  const t = type as ProductType;
  const products = await getByType(t);
  const meta = typeMeta[t];

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{meta.label}</h1>
        <span className="text-sm text-dim">{products.length} 个</span>
      </header>
      {products.length === 0 ? (
        <p className="capsule p-10 text-center text-sm text-dim">该分类暂无内容。</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} className="w-full" />
          ))}
        </div>
      )}
    </main>
  );
}
