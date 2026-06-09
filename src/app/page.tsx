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
      <SectionRow title="热门应用" en="APPS" products={getByType("app")} delay={180} />
      <SectionRow title="AI 模型" en="MODELS" products={getByType("model")} delay={240} />
      <SectionRow title="Agent 招募所" en="AGENTS" products={getByType("agent")} delay={300} />
      <SectionRow title="Skill 工坊" en="WORKSHOP" products={getByType("skill")} delay={360} />
      <SectionRow title="教程与视频" en="LEARN & WATCH" products={tutorialsAndVideos} delay={420} />
    </main>
  );
}
