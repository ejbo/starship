import { CategoryTiles } from "@/components/store/category-tiles";
import { DiscoveryQueue } from "@/components/store/discovery-queue";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { SectionRow } from "@/components/store/section-row";
import { TopCharts } from "@/components/store/top-charts";
import { getAllProducts, getByType, getDiscoveryQueue, getFeatured } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const [featured, discovery, all, apps, models, agents, skills, tutorials, videos] = await Promise.all([
    getFeatured(),
    getDiscoveryQueue(),
    getAllProducts(),
    getByType("app"),
    getByType("model"),
    getByType("agent"),
    getByType("skill"),
    getByType("tutorial"),
    getByType("video"),
  ]);

  const byNewest = [...all].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
  const byRating = [...all].sort((a, b) => b.rating.score - a.rating.score);
  const free = all.filter((p) => p.price === "free");

  const chartTabs = [
    { key: "top", label: "热门", products: all },
    { key: "new", label: "新品", products: byNewest },
    { key: "rated", label: "高分", products: byRating },
    { key: "free", label: "免费", products: free },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
      <HeroCarousel products={featured} />
      <CategoryTiles />
      <DiscoveryQueue products={discovery} />
      <TopCharts tabs={chartTabs} />
      <SectionRow title="热门应用" products={apps} />
      <SectionRow title="AI 模型" products={models} />
      <SectionRow title="Agent" products={agents} />
      <SectionRow title="Skill 工坊" products={skills} />
      <SectionRow title="教程与视频" products={[...tutorials, ...videos]} />
    </main>
  );
}
