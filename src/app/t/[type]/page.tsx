import { notFound } from "next/navigation";
import { BrowseExplorer } from "@/components/store/browse-explorer";
import { typeMeta } from "@/components/ui/type-badge";
import { getAllProducts } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

export const dynamic = "force-dynamic";

const TYPES: ProductType[] = ["app", "model", "agent", "skill", "tutorial", "video"];

export default async function BrowseByTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!TYPES.includes(type as ProductType)) notFound();
  const t = type as ProductType;
  const products = await getAllProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold">{typeMeta[t].label}</h1>
      <BrowseExplorer products={products} initialType={t} />
    </main>
  );
}
