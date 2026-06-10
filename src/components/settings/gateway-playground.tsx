"use client";

import { useState, useTransition } from "react";
import { Send, Sparkles } from "lucide-react";
import { playgroundChatAction, type PlaygroundResult } from "@/app/settings/gateway/actions";

/** 已配置的 provider 列表（只展示用户配过密钥的） */
export function GatewayPlayground({ providers }: { providers: { id: string; name: string }[] }) {
  const [provider, setProvider] = useState(providers[0]?.id ?? "anthropic");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("用一句话介绍你自己");
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (providers.length === 0) {
    return (
      <div className="capsule p-5 text-sm text-dim">
        配置任意 provider 的密钥后，可在此直接试调，验证网关链路。
      </div>
    );
  }

  const run = () =>
    startTransition(async () => {
      setResult(null);
      const res = await playgroundChatAction(provider, model, prompt);
      setResult(res);
    });

  return (
    <div className="capsule space-y-3 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="size-4 text-accent" /> Playground —— 试调你的网关
      </h3>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-dim">Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-dim">模型（留空用默认）</span>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="如 claude-3-5-haiku-latest"
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          className="grow rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={run}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
        >
          <Send className="size-3.5" /> {pending ? "调用中…" : "发送"}
        </button>
      </div>

      {result && (
        <div
          className={
            result.ok
              ? "rounded-md border border-line bg-page p-3"
              : "rounded-md border border-warn/40 bg-warn/5 p-3"
          }
        >
          {result.ok ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{result.text}</p>
              <p className="mt-2 text-[11px] text-mute">{result.via}</p>
            </>
          ) : (
            <p className="text-sm text-warn">{result.error}</p>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-mute">
        调用经网关用你的密钥发起，真实 token 计入用量看板并受日限额约束。演示密钥会返回上游错误提示——填入真实密钥即可获得真实回复。
      </p>
    </div>
  );
}
