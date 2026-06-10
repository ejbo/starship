"use client";

import { useRef, useState } from "react";
import { Plus, Trophy, X } from "lucide-react";
import { addAchievementAction, deleteAchievementAction } from "@/app/developer/actions";
import { getProductIcon } from "@/lib/icons";

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
}

export function AchievementsEditor({ productId, achievements }: { productId: string; achievements: Achievement[] }) {
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3">
      {achievements.length === 0 ? (
        <p className="text-sm text-dim">还没有成就。下面添加第一个——应用解锁它后会出现在用户的成就墙。</p>
      ) : (
        <ul className="space-y-2">
          {achievements.map((a) => {
            const Icon = getProductIcon(a.icon);
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-md border border-line bg-page p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gold/10 text-gold">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {a.name} <code className="ml-1 font-mono text-[11px] text-mute">{a.key}</code>
                  </p>
                  <p className="truncate text-xs text-mute">{a.description}</p>
                </div>
                <form action={deleteAchievementAction.bind(null, productId, a.id)} className="ml-auto">
                  <button type="submit" className="rounded p-1.5 text-mute transition-colors hover:bg-danger/8 hover:text-danger" aria-label="删除成就">
                    <X className="size-4" />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      <form
        ref={formRef}
        action={async (fd) => {
          setPending(true);
          try {
            await addAchievementAction(productId, fd);
            formRef.current?.reset();
          } finally {
            setPending(false);
          }
        }}
        className="grid gap-2 rounded-md border border-dashed border-line p-3 sm:grid-cols-2"
      >
        <input name="key" required placeholder="key（如 first_win）" className="rounded-md border border-line bg-page px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none" />
        <input name="name" required placeholder="名称（如 首胜）" className="rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        <input name="icon" placeholder="图标名（trophy）" defaultValue="trophy" className="rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        <input name="description" placeholder="描述" className="rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        <button
          type="submit"
          disabled={pending}
          className="flex items-center justify-center gap-1.5 rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50 sm:col-span-2"
        >
          <Plus className="size-4" /> {pending ? "添加中…" : "添加成就"}
        </button>
      </form>

      <p className="flex items-center gap-1.5 text-[11px] text-mute">
        <Trophy className="size-3 text-gold" /> 应用通过 SDK 的 achievements.unlock(key) 或 POST /api/v1/achievements/unlock 解锁。
      </p>
    </div>
  );
}
