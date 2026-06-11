import { BrowseExplorer } from "@/components/store/browse-explorer";
import { getAllProducts } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: ProductType[] = ["app", "model", "agent", "skill", "tutorial", "video"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q, type } = await searchParams;
  const products = await getAllProducts();
  const initialType = type && TYPES.includes(type as ProductType) ? (type as ProductType) : "all";

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold">浏览商店</h1>
      <BrowseExplorer products={products} initialQuery={q ?? ""} initialType={initialType} />
    </main>
  );
}
