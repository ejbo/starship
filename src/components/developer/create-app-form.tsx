"use client";

import { useState } from "react";
import { createAppAction } from "@/app/developer/actions";

const types = [
  { value: "app", label: "应用" },
  { value: "agent", label: "Agent" },
  { value: "skill", label: "Skill" },
  { value: "tutorial", label: "教程" },
  { value: "model", label: "模型" },
  { value: "video", label: "视频" },
];

export function CreateAppForm() {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        await createAppAction(fd);
      }}
      className="space-y-3"
    >
      <label className="block space-y-1">
        <span className="text-xs text-dim">应用名</span>
        <input
          name="name"
          required
          placeholder="我的应用"
          className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-dim">类型</span>
        <select name="type" className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none">
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-dim">一句话简介</span>
        <input
          name="tagline"
          placeholder="它能做什么"
          className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建应用（草稿）"}
      </button>
      <p className="text-[11px] leading-relaxed text-mute">创建后将获得 client_id 与一次性 client_secret，用于开放 API 接入。</p>
    </form>
  );
}
