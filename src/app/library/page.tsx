import { redirect } from "next/navigation";
import { LibraryView, type LibItem } from "@/components/library/library-view";
import { getLibrary } from "@/lib/catalog";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const library = await getLibrary();

  const items: LibItem[] = library.map((i) => ({
    slug: i.product.slug,
    name: i.product.name,
    type: i.product.type,
    art: i.product.art,
    developer: i.product.developer,
    usageHours: i.usageHours,
    lastUsedAt: i.lastUsedAt ?? null,
    acquiredAt: i.acquiredAt,
    hasEntry: Boolean(i.product.entry),
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">库</h1>
        <span className="text-sm text-dim">{items.length} 个产品</span>
      </header>
      {items.length === 0 ? (
        <p className="capsule p-10 text-center text-sm text-dim">库还是空的，去商店获取一些产品吧。</p>
      ) : (
        <LibraryView items={items} />
      )}
    </main>
  );
}
