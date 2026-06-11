import { CategoryTiles } from "@/components/store/category-tiles";
import { DiscoveryQueue } from "@/components/store/discovery-queue";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { PromoBanner } from "@/components/store/promo-banner";
import { SectionRow } from "@/components/store/section-row";
import { StoreSubnav } from "@/components/store/store-subnav";
import { TopCharts } from "@/components/store/top-charts";
import { Reveal } from "@/components/ui/reveal";
import { getActiveBanners } from "@/lib/admin-service";
import { getAllProducts, getByType, getDiscounted, getDiscoveryQueue, getFeatured } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const [featured, discovery, all, apps, models, agents, skills, tutorials, videos, banners, discounted] = await Promise.all([
    getFeatured(),
    getDiscoveryQueue(),
    getAllProducts(),
    getByType("app"),
    getByType("model"),
    getByType("agent"),
    getByType("skill"),
    getByType("tutorial"),
    getByType("video"),
    getActiveBanners(),
    getDiscounted(),
  ]);

  const byNewest = [...all].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  const byRating = [...all].sort((a, b) => b.rating.score - a.rating.score);
  const free = all.filter((p) => p.price === "free");

  // 全站按下载量的排名（热销榜），喂给精选卡的"本周第 N 名"徽标
  const ranks: Record<string, number> = Object.fromEntries(all.map((p, i) => [p.slug, i + 1]));

  const chartTabs = [
    { key: "top", label: "热销", products: all },
    { key: "new", label: "新品", products: byNewest },
    { key: "rated", label: "高分", products: byRating },
    { key: "free", label: "免费", products: free },
  ];

  return (
    <>
      <StoreSubnav />
      {/* 全宽首发横幅（仿 Steam BULLET FEST），脱离内容容器做满屏出血 */}
      <PromoBanner
        banners={banners.map((b) => ({
          title: b.title,
          subtitle: b.subtitle,
          badge: b.badge,
          imageUrl: b.imageUrl,
          videoUrl: b.videoUrl,
          href: b.href,
        }))}
      />
      <main className="mx-auto max-w-7xl space-y-10 px-4 pt-6 sm:px-6">
        <HeroCarousel products={featured} ranks={ranks} />
        {discounted.length > 0 && <Reveal><SectionRow title="限时特惠" products={discounted} /></Reveal>}
        <Reveal><CategoryTiles /></Reveal>
        <Reveal>
          <div id="discovery" className="scroll-mt-28">
            <DiscoveryQueue products={discovery} />
          </div>
        </Reveal>
        <Reveal>
          <div id="charts" className="scroll-mt-28">
            <TopCharts tabs={chartTabs} />
          </div>
        </Reveal>
        <Reveal><SectionRow title="热门应用" products={apps} /></Reveal>
        <Reveal><SectionRow title="AI 模型" products={models} /></Reveal>
        <Reveal><SectionRow title="Agent" products={agents} /></Reveal>
        <Reveal><SectionRow title="Skill 工坊" products={skills} /></Reveal>
        <Reveal><SectionRow title="教程与视频" products={[...tutorials, ...videos]} /></Reveal>
      </main>
    </>
  );
}
