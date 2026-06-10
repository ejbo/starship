import Link from "next/link";
import { getProductIcon } from "@/lib/icons";
import type { ProductType } from "@/lib/types";

const tiles: { type: ProductType; label: string; en: string; icon: string; from: string; to: string }[] = [
  { type: "app", label: "应用", en: "APPS", icon: "grid", from: "#2563eb", to: "#4f8bf5" },
  { type: "model", label: "AI 模型", en: "MODELS", icon: "cpu", from: "#7c5cd6", to: "#a98cf0" },
  { type: "agent", label: "Agent", en: "AGENTS", icon: "bot", from: "#189a74", to: "#3fc79a" },
  { type: "skill", label: "Skill 工坊", en: "WORKSHOP", icon: "wand", from: "#b07d1e", to: "#dba943" },
  { type: "tutorial", label: "互动教程", en: "LEARN", icon: "graduation", from: "#c2417e", to: "#e472a6" },
  { type: "video", label: "视频", en: "WATCH", icon: "video", from: "#c05621", to: "#e3884f" },
];

/** Steam 式分类色块格子 */
export function CategoryTiles() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">按分类浏览</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => {
          const Icon = getProductIcon(t.icon);
          return (
            <Link
              key={t.type}
              href="/"
              className="group relative flex h-24 flex-col justify-between overflow-hidden rounded-lg p-3 text-white transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
            >
              <Icon className="size-5 opacity-90" />
              <div>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="font-display text-[10px] tracking-[0.2em] text-white/70">{t.en}</p>
              </div>
              <div className="absolute -right-3 -top-3 size-16 rounded-full bg-white/10 transition-transform group-hover:scale-125" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
