import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { getWishlistProducts } from "@/lib/catalog";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const products = await getWishlistProducts();

  return (
    <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <header className="mb-6 flex items-center gap-2">
        <Heart className="size-5 text-rose-500" />
        <h1 className="text-2xl font-bold">心愿单</h1>
        <span className="text-sm text-dim">{products.length}</span>
      </header>
      {products.length === 0 ? (
        <div className="capsule p-12 text-center text-sm text-dim">
          心愿单还是空的——逛逛商店，把想要的加进来，降价或更新时方便回来看。
        </div>
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
