import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AcquireBox } from "@/components/product/acquire-box";
import { CapabilityList } from "@/components/product/capability-list";
import { MediaGallery } from "@/components/product/media-gallery";
import { ReviewForm } from "@/components/product/review-form";
import { ReviewSection } from "@/components/product/review-section";
import { TypeBadge, typeMeta } from "@/components/ui/type-badge";
import { getBySlug } from "@/lib/catalog";
import { isInLibrary } from "@/lib/library-service";
import { getMyReview } from "@/lib/review-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getBySlug(slug);
  if (!product) notFound();

  const userId = await getSessionUserIdOrNull();
  const acquired = userId ? await isInLibrary(slug) : false;
  const myReview = userId ? await getMyReview(slug) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      {/* 面包屑 */}
      <nav className="mb-4 flex items-center gap-1 text-xs text-mute">
        <Link href="/" className="transition-colors hover:text-accent">商店</Link>
        <ChevronRight className="size-3" />
        <span>{typeMeta[product.type].label}</span>
        <ChevronRight className="size-3" />
        <span className="text-dim">{product.name}</span>
      </nav>

      {/* 标题区 */}
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <TypeBadge type={product.type} />
        </div>
        <p className="mt-2 text-dim">{product.tagline}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        {/* 左主栏 */}
        <div className="min-w-0 space-y-8">
          <MediaGallery art={product.art} />

          <section className="space-y-3">
            <h2 className="text-lg font-bold">关于</h2>
            {product.description.map((para, i) => (
              <p key={i} className="text-sm leading-7 text-ink/85">{para}</p>
            ))}
          </section>

          {userId && <ReviewForm slug={product.slug} initial={myReview} />}
          <ReviewSection product={product} />
        </div>

        {/* 右侧栏 */}
        <aside className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <AcquireBox product={product} acquired={acquired} signedOut={!userId} />
          <CapabilityList capabilities={product.capabilities} />
          <div className="capsule p-5">
            <h3 className="mb-2.5 text-sm font-semibold">标签</h3>
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded bg-card-hi px-2 py-1 text-xs text-dim">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
