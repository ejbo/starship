import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { AchievementList } from "@/components/product/achievement-list";
import { AcquireBox } from "@/components/product/acquire-box";
import { CapabilityList } from "@/components/product/capability-list";
import { MediaGallery } from "@/components/product/media-gallery";
import { ReviewForm } from "@/components/product/review-form";
import { ReviewSection } from "@/components/product/review-section";
import { Rating } from "@/components/ui/rating";
import { TypeBadge, typeMeta } from "@/components/ui/type-badge";
import { describeCapability, getBySlug } from "@/lib/catalog";
import { getAchievementsForUser } from "@/lib/achievement-service";
import { getMyCredits, isInLibrary } from "@/lib/library-service";
import { getMyReview } from "@/lib/review-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getBySlug(slug);
  if (!product) notFound();

  const userId = await getSessionUserIdOrNull();
  const acquired = userId ? await isInLibrary(slug) : false;
  const credits = userId ? await getMyCredits() : 0;
  const myReview = userId ? await getMyReview(slug) : null;
  const achievements = await getAchievementsForUser(product.id, userId);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
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
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Rating score={product.rating.score} count={product.rating.count} className="text-sm" />
          <span className="text-sm text-mute">开发者 <span className="text-accent">{product.developer}</span></span>
        </div>
        {/* AI 集成能力芯片（取代标签，突出「它能用什么」） */}
        {product.capabilities.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Sparkles className="size-3.5 text-accent" />
            {product.capabilities.map((cap) => (
              <span key={cap} className="rounded-full border border-accent/25 bg-accent/5 px-2.5 py-0.5 text-xs text-accent">
                {describeCapability(cap).name}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0 space-y-8">
          <MediaGallery art={product.art} />

          <section className="space-y-3">
            <h2 className="text-lg font-bold">关于</h2>
            {product.description.map((para, i) => (
              <p key={i} className="text-sm leading-7 text-ink/85">{para}</p>
            ))}
          </section>

          <AchievementList achievements={achievements} />
          {userId && <ReviewForm slug={product.slug} initial={myReview} />}
          <ReviewSection product={product} />

          {/* 运行要求挪到底部 */}
          <CapabilityList capabilities={product.capabilities} />
        </div>

        {/* 右侧栏：只保留购买/获取盒 */}
        <aside className="lg:sticky lg:top-18 lg:self-start">
          <AcquireBox product={product} acquired={acquired} signedOut={!userId} credits={credits} />
        </aside>
      </div>
    </main>
  );
}
