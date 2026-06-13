"use client";

import { useState } from "react";
import { Bot, Check, Copy, MessageSquare, Sparkles, Terminal, X } from "lucide-react";
import { createAgentAction, type ConnectorCommand } from "@/app/agents-actions";
import { cn } from "@/lib/cn";

const KINDS = [
  {
    value: "hosted" as const,
    label: "平台托管",
    hint: "零配置，秒上线 · 平台 AI Gateway 生成回复",
    icon: Sparkles,
  },
  {
    value: "local-claude" as const,
    label: "本地 Claude Code",
    hint: "本机全能 agent：读写文件、跑命令、查资料",
    icon: Terminal,
  },
  {
    value: "local-codex" as const,
    label: "本地 Codex",
    hint: "OpenAI Codex CLI 驱动，能力同上",
    icon: Terminal,
  },
];

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[26rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(28_36_51/.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Bot className="size-4 text-accent" />
          <p className="text-sm font-semibold">{title}</p>
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
        <div className="grow overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2 rounded-lg border border-line bg-page px-2.5 py-2">
      <code className="grow whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-ink">{text}</code>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 rounded-md p-1 text-mute transition-colors hover:text-accent"
        aria-label="复制"
      >
        {copied ? <Check className="size-3.5 text-free" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

/** 连接命令展示（创建本地 agent 后 / 右键重置令牌后） */
export function ConnectorCommandView({ command }: { command: ConnectorCommand }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-dim">在装有 Claude Code / Codex 的电脑上跑这两行（令牌已带上，粘贴即用）：</p>
      <CopyLine text={command.download} />
      <CopyLine text={command.run} />
      <p className="text-[11px] leading-relaxed text-mute">
        启动后 Agent 自动转为在线；记忆与人设落在本机 starport-agents/ 目录（可手动编辑培养）。要全自动放开工具权限加 <code className="font-mono">--full-auto</code>。
      </p>
    </div>
  );
}

export function ConnectorCommandModal({ command, onClose }: { command: ConnectorCommand; onClose: () => void }) {
  return (
    <Shell title="连接器命令（令牌已重置）" onClose={onClose}>
      <ConnectorCommandView command={command} />
    </Shell>
  );
}

/** 编辑人设 */
export function PersonaModal({
  name,
  initial,
  onSave,
  onClose,
}: {
  name: string;
  initial: string;
  onSave: (persona: string) => Promise<void>;
  onClose: () => void;
}) {
  const [persona, setPersona] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <Shell title={`「${name}」的人设`} onClose={onClose}>
      <textarea
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        rows={6}
        maxLength={2000}
        placeholder="TA 是谁？负责什么？什么说话风格？"
        className="w-full resize-y rounded-lg border border-line bg-page px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
      />
      <p className="mt-1.5 text-[11px] text-mute">托管 Agent 立即生效；本地 Agent 的人设在其工作目录 CLAUDE.md，本机编辑生效。</p>
      <button
        onClick={async () => {
          setBusy(true);
          await onSave(persona);
          onClose();
        }}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
      >
        {busy ? "保存中…" : "保存"}
      </button>
    </Shell>
  );
}

/** 创建 Agent：起名 → 选形态 →（可选人设）→ 创建；本地形态展示一键连接命令 */
export function AgentModal({
  onClose,
  onCreated,
  onOpenChat,
}: {
  onClose: () => void;
  onCreated: () => Promise<unknown>;
  onOpenChat: (handle: string) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("hosted");
  const [persona, setPersona] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ handle: string; name: string; command?: ConnectorCommand } | null>(null);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await createAgentAction({ name: name.trim(), agentKind: kind, persona: persona.trim() || undefined });
    setBusy(false);
    if (!res.ok || !res.agent) {
      setError(res.error ?? "创建失败");
      return;
    }
    await onCreated();
    setDone({ handle: res.agent.handle, name: res.agent.name, command: res.command });
  };

  if (done) {
    return (
      <Shell title={`「${done.name}」已创建`} onClose={onClose}>
        <div className="space-y-3">
          {done.command ? (
            <ConnectorCommandView command={done.command} />
          ) : (
            <p className="text-sm text-dim">托管 Agent 已就绪、随时在线，直接发消息即可。</p>
          )}
          <div className="rounded-lg bg-card-hi px-3 py-2 text-[11px] leading-relaxed text-dim">
            群聊里 <code className="font-mono">@{done.handle}</code> 或 @{done.name} 才会唤醒 TA；私聊每条必回。可以把 TA 邀进群组和其他成员（包括其他 Agent）协作。
          </div>
          <button
            onClick={() => {
              onOpenChat(done.handle);
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
          >
            <MessageSquare className="size-4" /> 发消息试试
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title="添加 AI Agent" onClose={onClose}>
      <div className="space-y-3.5">
        <label className="block space-y-1">
          <span className="text-xs text-dim">名字</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            maxLength={24}
            placeholder="比如：调研员小鲸"
            className="w-full rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs text-dim">形态</span>
          {KINDS.map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                kind === k.value ? "border-accent bg-accent/5" : "border-line hover:border-accent/40",
              )}
            >
              <k.icon className={cn("size-4 shrink-0", kind === k.value ? "text-accent" : "text-mute")} />
              <span className="min-w-0 leading-tight">
                <span className="block text-sm font-medium">{k.label}</span>
                <span className="block truncate text-[11px] text-mute">{k.hint}</span>
              </span>
              <span className={cn("ml-auto size-3.5 shrink-0 rounded-full border-2", kind === k.value ? "border-accent bg-accent" : "border-line")} />
            </button>
          ))}
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-dim">人设 / 角色（可选）</span>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="TA 是谁？负责什么？什么说话风格？留空也行，之后可改。"
            className="w-full resize-y rounded-lg border border-line bg-page px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
          />
        </label>

        {error && <p className="text-xs text-danger">{error}</p>}
        <button
          onClick={create}
          disabled={!name.trim() || busy}
          className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-40"
        >
          {busy ? "创建中…" : "创建 Agent"}
        </button>
      </div>
    </Shell>
  );
}
