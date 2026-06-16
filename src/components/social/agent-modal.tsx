"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check, ChevronDown, Copy, FolderOpen, ImagePlus, MessageSquare, Pencil, Sparkles, Terminal, X } from "lucide-react";
import {
  createAgentAction,
  getAgentDetailAction,
  getAgentFilesAction,
  getMyAgentDefaultsAction,
  saveAgentFileAction,
  updateAgentPersonaAction,
  updateAgentSettingsAction,
  type ConnectorCommand,
} from "@/app/agents-actions";
import { Avatar } from "@/components/ui/avatar";
import { DEFAULT_AGENT_SETTINGS, HOSTED_PROVIDERS, MODEL_SUGGESTIONS, PROVIDER_LABELS, REPLY_LENGTHS, REPLY_LENGTH_LABELS, type AgentSettings } from "@/lib/agent-shared";
import { copyText } from "@/lib/clipboard";
import { imageToDataUrl } from "@/components/social/presence";
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

/** 头像上传（图片 → 压缩 dataURL）+ 预览；未上传时回退到色相首字 */
function AvatarUpload({ name, hue, url, onUpload, onClear }: { name: string; hue: number; url: string | null; onUpload: (dataUrl: string) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative shrink-0 rounded-full"
        aria-label="上传头像"
      >
        <Avatar name={name || "A"} hue={hue} src={url} size="lg" isAgent />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ImagePlus className="size-5" />
        </span>
      </button>
      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-line px-2.5 py-1 text-xs text-dim transition-colors hover:border-accent/50 hover:text-accent">
          {busy ? "处理中…" : url ? "更换头像" : "上传头像"}
        </button>
        {url && (
          <button type="button" onClick={onClear} className="text-[11px] text-mute transition-colors hover:text-danger">
            移除
          </button>
        )}
        {err && <span className="text-[11px] text-danger">{err}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setErr(null);
          setBusy(true);
          try {
            onUpload(await imageToDataUrl(f));
          } catch {
            setErr("图片处理失败");
          }
          setBusy(false);
        }}
      />
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

function SelectRow({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="min-w-0 grow leading-tight">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mute">{hint}</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shrink-0 rounded-lg border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none"
      >
        {options.map(([v, label]) => (
          <option key={v} value={v}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function TextRow({ label, hint, value, placeholder, onChange }: { label: string; hint?: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <span className="min-w-0 grow leading-tight">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mute">{hint}</span>}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 shrink-0 rounded-lg border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none"
      />
    </div>
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

/** 托管：provider 下拉 + 模型可选（带常用模型建议）；本地：仅模型（按后端建议，透传到对应 CLI 的 --model/-m） */
export function ProviderModel({
  isHosted,
  agentKind,
  provider,
  model,
  onProvider,
  onModel,
}: {
  isHosted: boolean;
  agentKind: string;
  provider: string;
  model: string;
  onProvider: (p: string) => void;
  onModel: (m: string) => void;
}) {
  const suggestKey = isHosted ? provider : agentKind;
  const suggestions = MODEL_SUGGESTIONS[suggestKey] ?? [];
  const listId = `models-${suggestKey}`;
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
        <span className="text-xs text-dim">模型（可选）</span>
        <input
          value={model}
          list={listId}
          onChange={(e) => onModel(e.target.value)}
          placeholder={suggestions[0] ? `默认 · 例 ${suggestions[0]}` : "留空用默认"}
          className="w-full rounded-lg border border-line bg-page px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <datalist id={listId}>
          {suggestions.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
    </div>
  );
}

/** Agent 工作目录文件：未同步显示本地路径；已同步可查看/编辑（编辑写回本机） */
function AgentFiles({ handle, syncOn, agentKind }: { handle: string; syncOn: boolean; agentKind: string }) {
  const [files, setFiles] = useState<{ path: string; content: string; pendingPush: boolean; updatedAt: string }[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const ctxFile = agentKind === "local-gemini" ? "GEMINI.md" : agentKind === "local-qwen" ? "QWEN.md" : "CLAUDE.md";

  const load = async () => {
    const res = await getAgentFilesAction(handle);
    if (res.ok && res.files) {
      setFiles(res.files);
      if (res.files.length > 0 && sel === null) {
        setSel(res.files[0].path);
        setDraft(res.files[0].content);
      }
    }
  };
  useEffect(() => {
    if (syncOn) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOn, handle]);

  if (!syncOn) {
    return (
      <div className="space-y-1.5 rounded-lg border border-line p-2.5 text-[11px] leading-relaxed text-dim">
        <p className="text-ink">本地文件（在 TA 的工作目录）：</p>
        <p>人设：<code className="rounded bg-page px-1 font-mono">~/starport-agents/{handle}/{ctxFile}</code></p>
        <p>记忆：<code className="rounded bg-page px-1 font-mono">~/starport-agents/{handle}/memory/</code></p>
        <p className="text-mute">想在网页查看/编辑这些文件？打开上方「高级设置 → 同步工作目录文件」。</p>
      </div>
    );
  }

  const pick = (p: string) => {
    const f = files?.find((x) => x.path === p);
    setSel(p);
    setDraft(f?.content ?? "");
  };
  const save = async () => {
    if (sel === null) return;
    setBusy(true);
    await saveAgentFileAction(handle, sel, draft);
    setBusy(false);
    await load();
  };

  return (
    <div className="space-y-2">
      {files === null ? (
        <p className="py-2 text-center text-[11px] text-mute">加载中…</p>
      ) : files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-[11px] text-mute">连接器尚未上传文件——确保连接器在线、且已重新下载最新脚本。</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {files.map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => pick(f.path)}
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors",
                  sel === f.path ? "border-accent bg-accent/10 text-accent" : "border-line text-dim hover:border-accent/40",
                )}
              >
                {f.path}
                {f.pendingPush && <span className="ml-1 text-warn" title="待写回本机">●</span>}
              </button>
            ))}
          </div>
          {sel !== null && (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="w-full resize-y rounded-lg border border-line bg-page px-2.5 py-2 font-mono text-[11px] leading-relaxed focus:border-accent focus:outline-none"
              />
              <button onClick={save} disabled={busy} className="w-full rounded-lg bg-accent py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50">
                {busy ? "保存中…" : "保存并写回本机"}
              </button>
              <p className="text-[10px] text-mute">保存后会在连接器下次收件（约 20s 内）写回到 TA 本机的对应文件。</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** 文件 / 记忆 独立弹窗（从 Agent 设置里点开，不再挤在主弹窗内） */
function AgentFilesModal({ handle, name, syncOn, agentKind, onClose }: { handle: string; name: string; syncOn: boolean; agentKind: string; onClose: () => void }) {
  return (
    <Shell title={`「${name}」的文件 / 记忆`} onClose={onClose}>
      <AgentFiles handle={handle} syncOn={syncOn} agentKind={agentKind} />
    </Shell>
  );
}

/** 折叠的高级设置（上下文/唤醒/限速/本地权限） */
export function AdvancedSettings({ settings, isLocal, onChange, showAll = false, defaultOpen = false }: { settings: AgentSettings; isLocal: boolean; onChange: (patch: Partial<AgentSettings>) => void; showAll?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const showHosted = showAll || !isLocal;
  const showLocal = showAll || isLocal;
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-medium text-dim transition-colors hover:text-ink">
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        高级设置
        <span className="ml-auto text-[11px] text-mute">上下文 / 唤醒 / 限速{showLocal ? " / 权限" : ""}</span>
      </button>
      {open && (
        <div className="space-y-0.5 border-t border-line px-2 py-2">
          <NumberRow label="上下文条数" hint="agent 能看到的近期消息数" value={settings.contextMsgs} min={5} max={100} onChange={(v) => onChange({ contextMsgs: v })} />
          <Toggle label="允许被其他 Agent @ 唤醒" hint="关掉则只有人能叫它" checked={settings.allowAgentMention} onChange={(v) => onChange({ allowAgentMention: v })} />
          <Toggle label="私聊每条必回" hint="关掉则私聊也要 @ 它才回" checked={settings.dmAutoReply} onChange={(v) => onChange({ dmAutoReply: v })} />
          <Toggle label="群里不被 @ 也主动发言" hint="仅对真人消息生效，防 Agent 互刷" checked={settings.groupProactive} onChange={(v) => onChange({ groupProactive: v })} />
          <NumberRow label="互相 @ 链深上限" hint="Agent 之间最多接力几层" value={settings.maxHops} min={0} max={20} onChange={(v) => onChange({ maxHops: v })} />
          <NumberRow label="限速（条 / 分钟）" value={settings.rateLimit} min={1} max={120} onChange={(v) => onChange({ rateLimit: v })} />
          <NumberRow label="群发言冷却（秒）" hint="0=关；冷却期内不被唤醒，防刷屏" value={settings.groupSlowmodeSec} min={0} max={3600} onChange={(v) => onChange({ groupSlowmodeSec: v })} />
          {showHosted && (
            <>
              <div className="px-1 pt-1.5 text-[11px] font-medium text-mute">回复风格{showAll ? "（托管 agent 生效）" : ""}</div>
              <SelectRow label="回复长度" value={settings.replyLength} options={REPLY_LENGTHS.map((v) => [v, REPLY_LENGTH_LABELS[v]] as [string, string])} onChange={(v) => onChange({ replyLength: v })} />
              <TextRow label="回复语言" hint="留空=跟随对方" value={settings.replyLanguage} placeholder="跟随对方" onChange={(v) => onChange({ replyLanguage: v })} />
              <SelectRow
                label="排版"
                value={settings.replyMarkdown === null ? "auto" : settings.replyMarkdown ? "md" : "plain"}
                options={[["auto", "自动"], ["md", "markdown"], ["plain", "纯文本"]]}
                onChange={(v) => onChange({ replyMarkdown: v === "auto" ? null : v === "md" })}
              />
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="min-w-0 grow leading-tight">
                  <span className="block text-[13px] text-ink">采样温度</span>
                  <span className="block text-[11px] text-mute">越高越发散；留空用默认</span>
                </span>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={2}
                  value={settings.temperature ?? ""}
                  placeholder="默认"
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({ temperature: v === "" ? null : Math.max(0, Math.min(2, Number(v))) });
                  }}
                  className="w-16 shrink-0 rounded-lg border border-line bg-page px-2 py-1 text-sm focus:border-accent focus:outline-none"
                />
              </div>
            </>
          )}
          {showLocal && (
            <>
              {showAll && <div className="px-1 pt-1.5 text-[11px] font-medium text-mute">本地 agent 生效</div>}
              <Toggle label="默认放开全部工具（--full-auto）" checked={settings.fullAuto} onChange={(v) => onChange({ fullAuto: v })} />
              <Toggle label="独立配置沙箱（--isolate）" checked={settings.isolate} onChange={(v) => onChange({ isolate: v })} />
              <Toggle label="同步工作目录文件到平台" hint="开启后可在网页查看/编辑 TA 的人设与记忆文件，编辑会写回本机" checked={settings.syncFiles} onChange={(v) => onChange({ syncFiles: v })} />
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
        className="flex max-h-[85vh] w-[30rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(28_36_51/.35)]"
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

/** 连接命令展示：默认只给「下载 + 后台常驻」两行；前台/重启/说明收进折叠。本地 agent 创建后、右键取命令时复用。 */
export function ConnectorCommandView({ command }: { command: ConnectorCommand }) {
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-dim">在装好对应 CLI 的电脑上，依次粘贴运行这两行（令牌、目录已填好，任意目录都能跑）：</p>
      <CopyLine text={command.download} />
      <CopyLine text={command.daemon} />
      <p className="text-[11px] text-mute">配好后该 Agent 长期在线——关终端、重启电脑、崩溃都会自动恢复。</p>

      <button
        onClick={() => setMore((m) => !m)}
        className="flex items-center gap-1 pt-0.5 text-[11px] text-dim transition-colors hover:text-accent"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !more && "-rotate-90")} />
        前台运行 / 重启 / 更多说明
      </button>
      {more && (
        <div className="space-y-2 rounded-lg border border-line p-2.5 text-[11px] leading-relaxed text-dim">
          <p className="text-ink">前台运行（关终端即离线，调试用）：</p>
          <CopyLine text={command.foreground} />
          <p>重启 <Code>{command.restartDaemon}</Code> · 停止 <Code>{command.stopDaemon}</Code> · 开机自启 <Code>{command.bootPersist}</Code></p>
          <p>离线期间消息会排队、上线即处理；命令带固定 <Code>--dir</Code>，换目录会另起一套记忆。</p>
          <p>培养：人设/记忆在工作目录的上下文文件与 <Code>memory/</Code> 子目录，可手动编辑。</p>
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
  const [avatarHue] = useState(() => HUE_SWATCHES[Math.floor(Math.random() * HUE_SWATCHES.length)]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<AgentSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ handle: string; name: string; command?: ConnectorCommand } | null>(null);
  const isHosted = kind === "hosted";
  const patchSettings = (p: Partial<AgentSettings>) => setSettings((s) => ({ ...s, ...p }));

  // 预填用户的统一默认配置（在设置里设过一次，新建就不用重复录入）
  useEffect(() => {
    getMyAgentDefaultsAction().then((d) => setSettings(d.settings)).catch(() => {});
  }, []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await createAgentAction({
      name: name.trim(),
      agentKind: kind,
      persona: persona.trim() || undefined,
      avatarHue,
      avatarUrl,
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
          <p className="px-0.5 text-[11px] text-mute">私聊每条必回；群里 @{done.name} 才唤醒。可邀 TA 进群与其他成员协作。</p>
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
          <span className="text-xs text-dim">头像</span>
          <AvatarUpload name={name} hue={avatarHue} url={avatarUrl} onUpload={setAvatarUrl} onClear={() => setAvatarUrl(null)} />
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
          agentKind={kind}
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [agentKind, setAgentKind] = useState("hosted");
  const [settings, setSettings] = useState<AgentSettings>({ ...DEFAULT_AGENT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
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
        setAvatarUrl(res.detail.avatarUrl);
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
      avatarUrl,
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

  const personaPreview = persona.trim().split("\n")[0]?.slice(0, 40) || "未设置";

  return (
    <>
      <Shell title="Agent 设置" onClose={onClose}>
        {loading ? (
          <p className="py-6 text-center text-sm text-mute">加载中…</p>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <AvatarUpload name={name} hue={avatarHue} url={avatarUrl} onUpload={setAvatarUrl} onClear={() => setAvatarUrl(null)} />
              <label className="block min-w-0 grow space-y-1">
                <span className="text-xs text-dim">名字</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  className="w-full rounded-lg border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </label>
            </div>

            <ProviderModel
              isHosted={isHosted}
              agentKind={agentKind}
              provider={settings.provider}
              model={settings.model ?? ""}
              onProvider={(p) => patchSettings({ provider: p })}
              onModel={(m) => patchSettings({ model: m })}
            />

            {/* 人设：一句话预览 + 点击打开完整编辑 */}
            <div className="space-y-1">
              <span className="text-xs text-dim">人设 / 角色</span>
              <button
                onClick={() => setPersonaOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-page px-3 py-2 text-left transition-colors hover:border-accent/50"
              >
                <span className={cn("min-w-0 grow truncate text-sm", persona.trim() ? "text-ink" : "text-mute")}>{personaPreview}</span>
                <Pencil className="size-3.5 shrink-0 text-mute" />
              </button>
            </div>

            <AdvancedSettings settings={settings} isLocal={!isHosted} onChange={patchSettings} />

            {!isHosted && (
              <button
                onClick={() => setFilesOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg border border-line bg-page px-3 py-2.5 text-left text-sm transition-colors hover:border-accent/50"
              >
                <FolderOpen className="size-4 shrink-0 text-mute" />
                <span className="grow">文件 / 记忆</span>
                <span className="text-[11px] text-mute">{settings.syncFiles ? "查看 / 编辑" : "本地路径"}</span>
              </button>
            )}

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

      {personaOpen && (
        <PersonaModal
          name={name}
          initial={persona}
          onSave={async (p) => {
            await updateAgentPersonaAction(handle, p);
            setPersona(p);
          }}
          onClose={() => setPersonaOpen(false)}
        />
      )}
      {filesOpen && <AgentFilesModal handle={handle} name={name} syncOn={settings.syncFiles} agentKind={agentKind} onClose={() => setFilesOpen(false)} />}
    </>
  );
}
