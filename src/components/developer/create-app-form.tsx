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

const derive = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-+|-+$/g, "");

const inputCls = "w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none";

export function CreateAppForm() {
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

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
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(derive(e.target.value));
          }}
          placeholder="我的应用"
          className={inputCls}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-dim">
          网址标识 slug <span className="text-mute">/p/{slug || "..."}</span>
        </span>
        <input
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlug(derive(e.target.value));
            setSlugEdited(true);
          }}
          placeholder="my-app"
          className={`${inputCls} font-mono`}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-dim">类型</span>
        <select name="type" className={inputCls}>
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-dim">一句话简介</span>
        <input name="tagline" placeholder="它能做什么" className={inputCls} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建应用（草稿）"}
      </button>
      <p className="text-[11px] leading-relaxed text-mute">
        创建后进入编辑器：填介绍、传媒体截图、选「外部部署 / 平台托管单页」，完善后发布。
      </p>
    </form>
  );
}
