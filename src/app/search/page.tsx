import { ProductCard } from "@/components/store/product-card";
import { getAllProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const all = await getAllProducts();
  const lc = query.toLowerCase();
  const results = query
    ? all.filter((p) => [p.name, p.tagline, p.developer, ...p.tags].some((s) => s.toLowerCase().includes(lc)))
    : [];

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="mb-1 text-2xl font-bold">搜索</h1>
      <p className="mb-6 text-sm text-dim">
        {query ? `“${query}” 的结果 · ${results.length} 个` : "输入关键词搜索应用、模型、Agent、Skill…"}
      </p>
      {query && results.length === 0 ? (
        <p className="capsule p-10 text-center text-sm text-dim">没有匹配的产品。换个关键词试试。</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} className="w-full" />
          ))}
        </div>
      )}
    </main>
  );
}
