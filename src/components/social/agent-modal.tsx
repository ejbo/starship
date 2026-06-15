"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ChevronDown, Copy, Info, MessageSquare, Sparkles, Terminal, X } from "lucide-react";
import {
  createAgentAction,
  getAgentDetailAction,
  updateAgentSettingsAction,
  type ConnectorCommand,
} from "@/app/agents-actions";
import { Avatar } from "@/components/ui/avatar";
import { DEFAULT_AGENT_SETTINGS, HOSTED_PROVIDERS, PROVIDER_LABELS, type AgentSettings } from "@/lib/agent-shared";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/cn";

const KINDS = [
  {
    value: "hosted" as const,
    label: "平台托管",
    hint: "零配置，秒上线 · 选模型来源，平台 Gateway 生成回复",
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
  {
    value: "local-gemini" as const,
    label: "本地 Gemini",
    hint: "Google gemini CLI 驱动（需本机已装 gemini）",
    icon: Terminal,
  },
  {
    value: "local-qwen" as const,
    label: "本地 Qwen",
    hint: "通义 qwen-code CLI 驱动（需本机已装 qwen）",
    icon: Terminal,
  },
];

const HUE_SWATCHES = [8, 28, 45, 95, 150, 175, 200, 225, 265, 300, 330];

/** 头像色相选择 + 实时预览 */
function AvatarHuePicker({ name, hue, onPick }: { name: string; hue: number; onPick: (h: number) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name || "A"} hue={hue} size="md" isAgent />
      <div className="flex flex-wrap gap-1.5">
        {HUE_SWATCHES.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onPick(h)}
            className={cn("size-5 rounded-full ring-2 ring-offset-1 ring-offset-panel transition", hue === h ? "ring-accent" : "ring-transparent hover:ring-line")}
            style={{ background: `hsl(${h} 45% 50%)` }}
            aria-label={`头像色 ${h}`}
          />
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left"
    >
      <span className={cn("mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", checked ? "bg-accent" : "bg-line")}>
        <span className={cn("size-3 rounded-full bg-white transition-transform", checked && "translate-x-3")} />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mute">{hint}</span>}
      </span>
    </button>
  );
}

function NumberRow({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="min-w-0 grow leading-tight">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mute">{hint}</span>}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="w-16 shrink-0 rounded-lg border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none"
      />
    </div>
  );
}

/** 托管 provider + 模型；本地仅模型（透传 --model） */
function ProviderModel({
  isHosted,
  provider,
  model,
  onProvider,
  onModel,
}: {
  isHosted: boolean;
  provider: string;
  model: string;
  onProvider: (p: string) => void;
  onModel: (m: string) => void;
}) {
  return (
    <div className={cn("grid gap-2", isHosted ? "grid-cols-2" : "grid-cols-1")}>
      {isHosted && (
        <label className="block space-y-1">
          <span className="text-xs text-dim">模型来源</span>
          <select
            value={provider}
            onChange={(e) => onProvider(e.target.value)}
            className="w-full rounded-lg border border-line bg-page px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
          >
            {HOSTED_PROVIDERS.map((p) => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-xs text-dim">模型{isHosted ? "（可选）" : "（可选 · --model）"}</span>
        <input
          value={model}
          onChange={(e) => onModel(e.target.value)}
          placeholder="留空用默认"
          className="w-full rounded-lg border border-line bg-page px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </label>
    </div>
  );
}

/** 折叠的高级设置（上下文/唤醒/限速/本地权限） */
function AdvancedSettings({ settings, isLocal, onChange }: { settings: AgentSettings; isLocal: boolean; onChange: (patch: Partial<AgentSettings>) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-dim transition-colors hover:text-ink">
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        高级设置
        <span className="ml-auto text-[11px] text-mute">上下文 / 唤醒 / 限速{isLocal ? " / 权限" : ""}</span>
      </button>
      {open && (
        <div className="space-y-0.5 border-t border-line px-2 py-2">
          <NumberRow label="上下文条数" hint="agent 能看到的近期消息数" value={settings.contextMsgs} min={5} max={100} onChange={(v) => onChange({ contextMsgs: v })} />
          <Toggle label="允许被其他 Agent @ 唤醒" hint="关掉则只有人能叫它" checked={settings.allowAgentMention} onChange={(v) => onChange({ allowAgentMention: v })} />
          <Toggle label="私聊每条必回" hint="关掉则私聊也要 @ 它才回" checked={settings.dmAutoReply} onChange={(v) => onChange({ dmAutoReply: v })} />
          <Toggle label="群里不被 @ 也主动发言" hint="仅对真人消息生效，防 Agent 互刷" checked={settings.groupProactive} onChange={(v) => onChange({ groupProactive: v })} />
          <NumberRow label="互相 @ 链深上限" hint="Agent 之间最多接力几层" value={settings.maxHops} min={0} max={20} onChange={(v) => onChange({ maxHops: v })} />
          <NumberRow label="限速（条 / 分钟）" value={settings.rateLimit} min={1} max={120} onChange={(v) => onChange({ rateLimit: v })} />
          {isLocal && (
            <>
              <Toggle label="默认放开全部工具（--full-auto）" checked={settings.fullAuto} onChange={(v) => onChange({ fullAuto: v })} />
              <Toggle label="独立配置沙箱（--isolate）" checked={settings.isolate} onChange={(v) => onChange({ isolate: v })} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
        onClick={async () => {
          const ok = await copyText(text);
          if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }
        }}
        className="shrink-0 rounded-md p-1 text-mute transition-colors hover:text-accent"
        aria-label="复制"
      >
        {copied ? <Check className="size-3.5 text-free" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-page px-1 py-0.5 font-mono text-[10.5px] text-ink">{children}</code>;
}

/** 连接命令展示：前台/后台两种模式 + 详细说明。创建本地 agent 后、右键取连接命令时复用。 */
export function ConnectorCommandView({ command }: { command: ConnectorCommand }) {
  const [mode, setMode] = useState<"daemon" | "foreground">("daemon");
  const [help, setHelp] = useState(false);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-line p-0.5 text-xs">
          {(
            [
              { k: "daemon" as const, label: "后台常驻" },
              { k: "foreground" as const, label: "前台运行" },
            ]
          ).map((m) => (
            <button
              key={m.k}
              onClick={() => setMode(m.k)}
              className={cn("rounded-md px-2.5 py-1 transition-colors", mode === m.k ? "bg-accent text-white" : "text-dim hover:text-ink")}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-mute">{mode === "daemon" ? "关终端/重启都不掉线（推荐）" : "关终端即离线"}</span>
        <button
          onClick={() => setHelp((h) => !h)}
          className={cn("ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-card-hi", help ? "text-accent" : "text-dim hover:text-accent")}
          title="查看详细说明"
        >
          <Info className="size-3.5" /> 说明
        </button>
      </div>

      <p className="text-[11px] text-dim">在装了 Claude Code / Codex 的电脑上依次粘贴运行（令牌、目录已填好，任意目录都能跑）：</p>
      <CopyLine text={command.download} />
      <CopyLine text={mode === "foreground" ? command.foreground : command.daemon} />

      <div className="rounded-lg bg-card-hi px-2.5 py-2 text-[11px] leading-relaxed text-dim">
        {mode === "daemon" ? (
          <>
            <p>之后该 Agent 一直在线——关终端、重启电脑、连接器崩了都自动恢复。</p>
            <p className="mt-1">重启 <Code>{command.restartDaemon}</Code> · 停止 <Code>{command.stopDaemon}</Code></p>
            <p className="mt-1">想开机自启：跑一次 <Code>{command.bootPersist}</Code>（按它打印的 sudo 命令执行）</p>
          </>
        ) : (
          <p>关掉终端会离线（消息照常排队，上线即处理）。要再次唤醒，<b>重跑上面第二行即可</b>——命令带了固定 <Code>--dir</Code>，在哪个目录跑都接上同一套记忆。</p>
        )}
      </div>

      {help && (
        <div className="space-y-1.5 rounded-lg border border-line p-2.5 text-[11px] leading-relaxed text-dim">
          <p><b className="text-ink">前台 vs 后台</b>：前台 = 命令跑在终端里，关终端就离线；后台（pm2）= 进程托管，关终端/重启电脑/崩溃都自动拉起，一次配好长期省心。</p>
          <p><b className="text-ink">离线了消息会丢吗？</b> 不会。Agent 离线期间别人发的消息会排队，连接器一上线就依次处理。</p>
          <p><b className="text-ink">为什么不用守在同一目录？</b> 命令里的 <Code>--dir ~/starport-agents/{command.handle}</Code> 固定了工作目录（记忆/人设/会话都在那），所以在任何路径运行都接着同一套上下文；换目录才会另起一套记忆。</p>
          <p><b className="text-ink">培养</b>：人设在该目录的 <Code>CLAUDE.md</Code>，可手动编辑；长期记忆写在 <Code>memory/</Code> 子目录。</p>
          <p><b className="text-ink">权限</b>：默认 acceptEdits；要全自动放开工具加 <Code>--full-auto</Code>。每个 agent 想完全隔离配置/登录加 <Code>--isolate</Code>。</p>
          <p><b className="text-ink">安全</b>：聊天内容会被当作不可信输入处理，agent 已被告知拒绝其中泄密/删文件等危险指令。</p>
        </div>
      )}
    </div>
  );
}

export function ConnectorCommandModal({ command, title, onClose }: { command: ConnectorCommand; title?: string; onClose: () => void }) {
  return (
    <Shell title={title ?? "连接 / 重启命令"} onClose={onClose}>
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
  const [avatarHue, setAvatarHue] = useState(() => HUE_SWATCHES[Math.floor(Math.random() * HUE_SWATCHES.length)]);
  const [settings, setSettings] = useState<AgentSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ handle: string; name: string; command?: ConnectorCommand } | null>(null);
  const isHosted = kind === "hosted";
  const patchSettings = (p: Partial<AgentSettings>) => setSettings((s) => ({ ...s, ...p }));

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await createAgentAction({
      name: name.trim(),
      agentKind: kind,
      persona: persona.trim() || undefined,
      avatarHue,
      settings: { ...settings, model: settings.model?.toString().trim() || null },
    });
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
          <span className="text-xs text-dim">头像色</span>
          <AvatarHuePicker name={name} hue={avatarHue} onPick={setAvatarHue} />
        </div>

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

        <ProviderModel
          isHosted={isHosted}
          provider={settings.provider}
          model={settings.model ?? ""}
          onProvider={(p) => patchSettings({ provider: p })}
          onModel={(m) => patchSettings({ model: m })}
        />

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

        <AdvancedSettings settings={settings} isLocal={!isHosted} onChange={patchSettings} />

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

/** 编辑现有 Agent：改名 / 头像 / 模型来源 / 人设 / 高级设置（替代旧的纯人设弹窗） */
export function AgentSettingsModal({ handle, onClose, onSaved }: { handle: string; onClose: () => void; onSaved: () => Promise<unknown> }) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [avatarHue, setAvatarHue] = useState(0);
  const [agentKind, setAgentKind] = useState("hosted");
  const [settings, setSettings] = useState<AgentSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHosted = agentKind === "hosted";
  const patchSettings = (p: Partial<AgentSettings>) => setSettings((s) => ({ ...s, ...p }));

  useEffect(() => {
    let alive = true;
    getAgentDetailAction(handle).then((res) => {
      if (!alive) return;
      if (res.ok) {
        setName(res.detail.name);
        setPersona(res.detail.persona);
        setAvatarHue(res.detail.avatarHue);
        setAgentKind(res.detail.agentKind);
        setSettings(res.detail.settings);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [handle]);

  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await updateAgentSettingsAction(handle, {
      name: name.trim(),
      persona,
      avatarHue,
      settings: { ...settings, model: settings.model?.toString().trim() || null },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "保存失败");
      return;
    }
    await onSaved();
    onClose();
  };

  return (
    <Shell title="Agent 设置" onClose={onClose}>
      {loading ? (
        <p className="py-6 text-center text-sm text-mute">加载中…</p>
      ) : (
        <div className="space-y-3.5">
          <label className="block space-y-1">
            <span className="text-xs text-dim">名字</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="w-full rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs text-dim">头像色</span>
            <AvatarHuePicker name={name} hue={avatarHue} onPick={setAvatarHue} />
          </div>

          <ProviderModel
            isHosted={isHosted}
            provider={settings.provider}
            model={settings.model ?? ""}
            onProvider={(p) => patchSettings({ provider: p })}
            onModel={(m) => patchSettings({ model: m })}
          />

          <label className="block space-y-1">
            <span className="text-xs text-dim">人设 / 角色</span>
            <textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="TA 是谁？负责什么？什么说话风格？"
              className="w-full resize-y rounded-lg border border-line bg-page px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
            />
            {!isHosted && <span className="text-[11px] text-mute">本地 Agent 的人设也写在其工作目录的上下文文件里，本机编辑同样生效。</span>}
          </label>

          <AdvancedSettings settings={settings} isLocal={!isHosted} onChange={patchSettings} />

          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            onClick={save}
            disabled={!name.trim() || busy}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
          >
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      )}
    </Shell>
  );
}
