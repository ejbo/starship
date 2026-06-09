import { DiscoveryQueue } from "@/components/store/discovery-queue";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { SectionRow } from "@/components/store/section-row";
import { getByType, getDiscoveryQueue, getFeatured } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const [featured, discovery, apps, models, agents, skills, tutorials, videos] = await Promise.all([
    getFeatured(),
    getDiscoveryQueue(),
    getByType("app"),
    getByType("model"),
    getByType("agent"),
    getByType("skill"),
    getByType("tutorial"),
    getByType("video"),
  ]);

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
      <HeroCarousel products={featured} />
      <DiscoveryQueue products={discovery} />
      <SectionRow title="热门应用" products={apps} />
      <SectionRow title="AI 模型" products={models} />
      <SectionRow title="Agent" products={agents} />
      <SectionRow title="Skill 工坊" products={skills} />
      <SectionRow title="教程与视频" products={[...tutorials, ...videos]} />
    </main>
  );
}
