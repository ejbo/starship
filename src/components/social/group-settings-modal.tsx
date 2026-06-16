"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Hash, ImagePlus, LogOut, Plus, Trash2, Volume2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  createChannelAction,
  deleteChannelAction,
  deleteGroupAction,
  leaveGroupAction,
  removeMemberAction,
  reorderChannelsAction,
  updateChannelAction,
  updateGroupProfileAction,
} from "@/app/friends-actions";
import { imageToDataUrl } from "@/components/social/presence";
import { cn } from "@/lib/cn";
import type { GroupChannel, GroupSummary } from "@/lib/group-service";
import { GroupAvatar } from "./friends-panel";
import { display } from "./presence";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-semibold tracking-wide text-mute">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/** 单个频道的可展开编辑行（名/主题/慢速/agent 范围 + 删除 + 上下移） */
function ChannelRow({
  channel,
  agents,
  canMoveUp,
  canMoveDown,
  onChanged,
  onMove,
}: {
  channel: GroupChannel;
  agents: { handle: string; name: string }[];
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChanged: () => Promise<unknown>;
  onMove: (dir: -1 | 1) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic);
  const [slow, setSlow] = useState(channel.slowmodeSec);
  const [scope, setScope] = useState<string[]>(channel.agentScope);
  const [busy, setBusy] = useState(false);
  const Icon = channel.kind === "voice" ? Volume2 : Hash;
  const toggleScope = (h: string) => setScope((s) => (s.includes(h) ? s.filter((x) => x !== h) : [...s, h]));

  const save = async () => {
    setBusy(true);
    await updateChannelAction(channel.id, { name, topic, slowmodeSec: slow, agentScope: scope });
    setBusy(false);
    setOpen(false);
    await onChanged();
  };
  const del = async () => {
    if (!window.confirm(`删除频道「${channel.name}」？该频道消息会一并清除。`)) return;
    const res = await deleteChannelAction(channel.id);
    if (!res.ok) {
      window.alert(res.error ?? "删除失败");
      return;
    }
    await onChanged();
  };

  return (
    <div className="rounded-lg border border-line">
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Icon className="size-3.5 shrink-0 text-mute" />
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 grow truncate text-left text-[13px] text-ink hover:text-accent">
          {channel.name}
          {channel.slowmodeSec > 0 && <span className="ml-1.5 text-[10px] text-mute">慢速 {channel.slowmodeSec}s</span>}
        </button>
        <button onClick={() => onMove(-1)} disabled={!canMoveUp} className="rounded p-0.5 text-mute transition-colors hover:text-ink disabled:opacity-30" aria-label="上移">
          <ArrowUp className="size-3.5" />
        </button>
        <button onClick={() => onMove(1)} disabled={!canMoveDown} className="rounded p-0.5 text-mute transition-colors hover:text-ink disabled:opacity-30" aria-label="下移">
          <ArrowDown className="size-3.5" />
        </button>
        <button onClick={del} className="rounded p-0.5 text-mute transition-colors hover:text-danger" aria-label="删除频道">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-line p-2.5">
          <label className="block space-y-1">
            <span className="text-[11px] text-dim">频道名</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none" />
          </label>
          {channel.kind === "text" && (
            <>
              <label className="block space-y-1">
                <span className="text-[11px] text-dim">频道主题（显示在频道顶部）</span>
                <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder="这个频道聊什么…" className="w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] text-dim">慢速模式（秒，0=关）</span>
                <input type="number" min={0} max={21600} value={slow} onChange={(e) => setSlow(Math.max(0, Math.min(21600, Number(e.target.value) || 0)))} className="w-24 rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none" />
              </label>
              {agents.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] text-dim">在此频道响应的 Agent（不选=全部）</span>
                  <div className="flex flex-wrap gap-1.5">
                    {agents.map((a) => {
                      const on = scope.includes(a.handle);
                      return (
                        <button
                          key={a.handle}
                          type="button"
                          onClick={() => toggleScope(a.handle)}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                            on ? "border-accent bg-accent/10 text-accent" : "border-line text-dim hover:border-accent/40",
                          )}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <button onClick={save} disabled={busy} className="w-full rounded-lg bg-accent py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50">
            {busy ? "保存中…" : "保存频道"}
          </button>
        </div>
      )}
    </div>
  );
}

export function GroupSettingsModal({
  group,
  meHandle,
  onClose,
  onChanged,
}: {
  group: GroupSummary;
  meHandle: string;
  onClose: () => void;
  onChanged: () => Promise<unknown>;
}) {
  const isOwner = group.ownerHandle === meHandle;
  const [name, setName] = useState(group.rawName);
  const [desc, setDesc] = useState(group.description);
  const [iconUrl, setIconUrl] = useState<string | null>(group.iconUrl);
  const [savingProfile, setSavingProfile] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<"text" | "voice">("text");
  const iconInput = useRef<HTMLInputElement>(null);

  const channels = [...group.channels].sort((a, b) => a.sort - b.sort);

  const saveProfile = async () => {
    setSavingProfile(true);
    await updateGroupProfileAction(group.id, { name, description: desc, iconUrl });
    setSavingProfile(false);
    await onChanged();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const ids = channels.map((c) => c.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await reorderChannelsAction(group.id, ids);
    await onChanged();
  };
  const addChannel = async () => {
    const n = newName.trim();
    if (!n) return;
    setAdding(false);
    setNewName("");
    await createChannelAction(group.id, n, newKind);
    await onChanged();
  };
  const remove = async (handle: string, displayName: string) => {
    if (!window.confirm(`将「${displayName}」移出群组？`)) return;
    const res = await removeMemberAction(group.id, handle);
    if (!res.ok) {
      window.alert(res.error ?? "移除失败");
      return;
    }
    await onChanged();
  };
  const leave = async () => {
    if (!window.confirm("退出该群组？")) return;
    await leaveGroupAction(group.id);
    await onChanged();
    onClose();
  };
  const dissolve = async () => {
    if (!window.confirm(`解散群组「${group.name}」？所有频道和消息将被永久删除，不可恢复。`)) return;
    const res = await deleteGroupAction(group.id);
    if (!res.ok) {
      window.alert(res.error ?? "解散失败");
      return;
    }
    await onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/30 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-[28rem] flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-[0_16px_48px_-12px_rgb(28_36_51/.35)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <p className="text-sm font-semibold">群组设置</p>
          {!isOwner && <span className="rounded bg-card-hi px-1.5 py-0.5 text-[10px] text-mute">非群主 · 部分设置只读</span>}
          <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-dim transition-colors hover:bg-card-hi hover:text-ink" aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>

        <div className="grow space-y-4 overflow-y-auto p-4">
          {/* 概览 */}
          <Section title="概览">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => isOwner && iconInput.current?.click()}
                className={cn("group relative shrink-0 rounded-full", !isOwner && "cursor-default")}
                aria-label="群图标"
              >
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconUrl} alt="" className="size-12 rounded-full object-cover" />
                ) : (
                  <GroupAvatar group={group} />
                )}
                {isOwner && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <ImagePlus className="size-4" />
                  </span>
                )}
              </button>
              <div className="min-w-0 grow space-y-1.5">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  maxLength={32}
                  placeholder={group.name}
                  className="w-full rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
                />
                {iconUrl && isOwner && (
                  <button onClick={() => setIconUrl(null)} className="text-[11px] text-mute transition-colors hover:text-danger">移除图标</button>
                )}
              </div>
              <input
                ref={iconInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    setIconUrl(await imageToDataUrl(f));
                  } catch {
                    /* ignore */
                  }
                }}
              />
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              disabled={!isOwner}
              rows={2}
              maxLength={500}
              placeholder={isOwner ? "群简介（可选）" : "（群主未设置简介）"}
              className="w-full resize-y rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm leading-relaxed focus:border-accent focus:outline-none disabled:opacity-60"
            />
            {isOwner && (
              <button onClick={saveProfile} disabled={savingProfile} className="w-full rounded-lg bg-accent py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50">
                {savingProfile ? "保存中…" : "保存群资料"}
              </button>
            )}
          </Section>

          {/* 频道 */}
          <Section
            title={`频道（${channels.length}）`}
            action={
              <button onClick={() => setAdding((a) => !a)} className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dim transition-colors hover:text-accent" title="新建频道">
                <Plus className="size-3.5" /> 新建
              </button>
            }
          >
            {adding && (
              <div className="flex items-center gap-1.5 rounded-lg border border-accent/50 bg-page p-1.5">
                <select value={newKind} onChange={(e) => setNewKind(e.target.value as "text" | "voice")} className="shrink-0 rounded-md border border-line bg-panel px-1.5 py-1 text-xs focus:outline-none">
                  <option value="text">文字</option>
                  <option value="voice">语音</option>
                </select>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChannel()} maxLength={20} placeholder="频道名…" className="min-w-0 grow rounded-md border border-line bg-panel px-2 py-1 text-sm focus:border-accent focus:outline-none" />
                <button onClick={addChannel} className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-deep">创建</button>
              </div>
            )}
            <div className="space-y-1.5">
              {channels.map((c, i) => (
                <ChannelRow
                  key={c.id}
                  channel={c}
                  agents={group.members.filter((m) => m.isAgent).map((m) => ({ handle: m.handle, name: m.remark || m.name }))}
                  canMoveUp={i > 0}
                  canMoveDown={i < channels.length - 1}
                  onChanged={onChanged}
                  onMove={(dir) => move(i, dir)}
                />
              ))}
            </div>
          </Section>

          {/* 成员 */}
          <Section title={`成员（${group.members.length}）`}>
            <div className="space-y-0.5">
              {group.members.map((m) => (
                <div key={m.handle} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-card-hi">
                  <Avatar name={display(m)} hue={m.avatarHue} src={m.avatarUrl} size="sm" isAgent={m.isAgent} />
                  <span className="min-w-0 grow truncate text-sm text-ink">
                    {display(m)}
                    {m.isOwner && <span className="ml-1.5 rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">群主</span>}
                    {m.isMe && <span className="ml-1 text-[11px] text-mute">（你）</span>}
                  </span>
                  {isOwner && !m.isMe && (
                    <button onClick={() => remove(m.handle, display(m))} className="shrink-0 rounded-md p-1 text-mute transition-colors hover:bg-danger/10 hover:text-danger" title="移出群组" aria-label="移出群组">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* 危险区 */}
          <Section title="危险区">
            <button onClick={leave} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 text-xs font-medium text-dim transition-colors hover:border-danger/50 hover:text-danger">
              <LogOut className="size-3.5" /> 退出群组
            </button>
            {isOwner && (
              <button onClick={dissolve} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-danger/40 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10">
                <Trash2 className="size-3.5" /> 解散群组（不可恢复）
              </button>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
