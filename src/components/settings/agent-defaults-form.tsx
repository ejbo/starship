"use client";

import { useEffect, useState } from "react";
import { getMyAgentDefaultsAction, saveMyAgentDefaultsAction } from "@/app/agents-actions";
import { AdvancedSettings, ProviderModel } from "@/components/social/agent-modal";
import { AGENT_ACTIVITY_PHRASES, DEFAULT_AGENT_SETTINGS, type AgentSettings } from "@/lib/agent-shared";

/** 用户级：新建 agent 的统一默认配置 + 自定义"正在回答"文案库 */
export function AgentDefaultsForm() {
  const [settings, setSettings] = useState<AgentSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const [phrasesText, setPhrasesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMyAgentDefaultsAction()
      .then((d) => {
        setSettings(d.settings);
        setPhrasesText(d.phrases.join("\n"));
      })
      .finally(() => setLoading(false));
  }, []);

  const patch = (p: Partial<AgentSettings>) => setSettings((s) => ({ ...s, ...p }));
  const save = async () => {
    setBusy(true);
    const phrases = phrasesText.split("\n").map((s) => s.trim()).filter(Boolean);
    await saveMyAgentDefaultsAction({ ...settings, model: settings.model?.toString().trim() || null }, phrases);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  if (loading) return <p className="text-sm text-mute">加载中…</p>;

  return (
    <div className="max-w-lg space-y-4">
      <section className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <div>
          <h2 className="text-sm font-semibold">新建 Agent 默认配置</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-dim">新建 agent 时自动套用以下配置；之后还能对每个 agent 单独微调，不必每次重填。</p>
        </div>
        <ProviderModel
          isHosted
          agentKind="hosted"
          provider={settings.provider}
          model={settings.model ?? ""}
          onProvider={(p) => patch({ provider: p })}
          onModel={(m) => patch({ model: m })}
        />
        <AdvancedSettings settings={settings} isLocal={false} showAll defaultOpen onChange={patch} />
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-panel p-4">
        <div>
          <h2 className="text-sm font-semibold">自定义「正在回答」文案库</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-dim">agent 回答时随机展示。每行一条，会与内置文案合并。</p>
        </div>
        <textarea
          value={phrasesText}
          onChange={(e) => setPhrasesText(e.target.value)}
          rows={5}
          placeholder={"比如：\n正在召唤神龙…\n正在翻阅古籍…\n正在请教老前辈…"}
          className="w-full resize-y rounded-lg border border-line bg-page px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
        />
        <p className="text-[11px] leading-relaxed text-mute">内置示例：{AGENT_ACTIVITY_PHRASES.slice(0, 6).join(" · ")} …</p>
      </section>

      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
      >
        {busy ? "保存中…" : saved ? "已保存 ✓" : "保存默认配置"}
      </button>
    </div>
  );
}
