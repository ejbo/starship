import Link from "next/link";
import { getProductIcon } from "@/lib/icons";
import type { ProductType } from "@/lib/types";

const img = (id: string) => `https://images.unsplash.com/${id}?w=640&q=70&auto=format&fit=crop`;

const tiles: { type: ProductType; label: string; en: string; icon: string; tint: string; photo: string }[] = [
  { type: "app", label: "应用", en: "APPS", icon: "grid", tint: "37 99 235", photo: img("photo-1517245386807-bb43f82c33c4") },
  { type: "model", label: "AI 模型", en: "MODELS", icon: "cpu", tint: "124 92 214", photo: img("photo-1677442136019-21780ecad995") },
  { type: "agent", label: "Agent", en: "AGENTS", icon: "bot", tint: "24 154 116", photo: img("photo-1485827404703-89b55fcc595e") },
  { type: "skill", label: "Skill 工坊", en: "WORKSHOP", icon: "wand", tint: "176 125 30", photo: img("photo-1591453089816-0fbb971b454c") },
  { type: "tutorial", label: "互动教程", en: "LEARN", icon: "graduation", tint: "194 65 126", photo: img("photo-1504384308090-c894fdcc538d") },
  { type: "video", label: "视频", en: "WATCH", icon: "video", tint: "192 86 33", photo: img("photo-1635070041078-e363dbe005cb") },
];

/** Steam 式分类格子：真实图片底 + 同色叠加，悬停轻微放大 */
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
              href={`/t/${t.type}`}
              className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-lg p-3 text-white shadow-sm transition-transform hover:-translate-y-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.photo}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(150deg, rgb(${t.tint} / 0.92), rgb(${t.tint} / 0.45) 60%, rgb(${t.tint} / 0.7))`,
                }}
              />
              <Icon className="relative size-5 opacity-95 drop-shadow" />
              <div className="relative">
                <p className="text-sm font-semibold drop-shadow">{t.label}</p>
                <p className="font-display text-[10px] tracking-[0.2em] text-white/75">{t.en}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
