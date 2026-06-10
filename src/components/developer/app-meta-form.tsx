"use client";

import { useState } from "react";
import { updateAppAction } from "@/app/developer/actions";

interface AppMetaFormProps {
  id: string;
  initial: {
    tagline: string;
    description: string;
    tags: string;
    capabilities: string;
    entryUrl: string;
    launchMode: string;
    icon: string;
    priceCredits: string;
  };
}

export function AppMetaForm({ id, initial }: AppMetaFormProps) {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (fd) => {
        setPending(true);
        try {
          await updateAppAction(id, fd);
          setSaved(true);
        } finally {
          setPending(false);
        }
      }}
      className="space-y-3"
    >
      <Field label="一句话简介" name="tagline" defaultValue={initial.tagline} />
      <label className="block space-y-1">
        <span className="text-xs text-dim">详细介绍（空行分段）</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={initial.description}
          onChange={() => setSaved(false)}
          className="w-full resize-y rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
      <Field label="标签（逗号分隔）" name="tags" defaultValue={initial.tags} placeholder="效率, 协作" />
      <Field
        label="运行要求 capabilities（空格分隔）"
        name="capabilities"
        defaultValue={initial.capabilities}
        placeholder="llm:claude storage:256mb"
      />
      <Field label="入口 URL（web 应用部署地址，留空则纯展示）" name="entryUrl" defaultValue={initial.entryUrl} placeholder="https://my-app.example.com" />
      <label className="block space-y-1">
        <span className="text-xs text-dim">运行方式</span>
        <select
          name="launchMode"
          defaultValue={initial.launchMode}
          onChange={() => setSaved(false)}
          className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="embedded">嵌入沙箱（iframe 内运行，用 postMessage SDK）</option>
          <option value="newtab">新标签页（独立 web 应用，用 OAuth + REST API）</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="图标名" name="icon" defaultValue={initial.icon} placeholder="grid" />
        <Field label="解锁点数（留空=免费）" name="priceCredits" defaultValue={initial.priceCredits} placeholder="0" />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存"}
        </button>
        {saved && <span className="text-sm text-free">已保存 ✓</span>}
      </div>
    </form>
  );
}

function Field({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue: string; placeholder?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-dim">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}
