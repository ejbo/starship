import { DiscoveryQueue } from "@/components/store/discovery-queue";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { SectionRow } from "@/components/store/section-row";
import { getByType, getDiscoveryQueue, getFeatured } from "@/lib/catalog";

export default function StorePage() {
  const tutorialsAndVideos = [...getByType("tutorial"), ...getByType("video")];

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
      <HeroCarousel products={getFeatured()} />
      <DiscoveryQueue products={getDiscoveryQueue()} />
      <SectionRow title="热门应用" products={getByType("app")} />
      <SectionRow title="AI 模型" products={getByType("model")} />
      <SectionRow title="Agent" products={getByType("agent")} />
      <SectionRow title="Skill 工坊" products={getByType("skill")} />
      <SectionRow title="教程与视频" products={tutorialsAndVideos} />
    </main>
  );
}
