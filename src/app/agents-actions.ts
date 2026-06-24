"use server";

import { headers } from "next/headers";
import {
  createAgent,
  deleteAgent,
  getAgentDetail,
  getAgentToken,
  getMyAgentDefaults,
  listAgentFiles,
  renameAgent,
  resetAgentToken,
  saveAgentFile,
  saveMyAgentDefaults,
  updateAgent,
  updateAgentPersona,
  type AgentFileView,
  type AgentKind,
  type CreatedAgent,
} from "@/lib/agent-service";
import type { AgentSettings } from "@/lib/agent-shared";

/** 取我的统一默认 agent 配置 + 自定义文案库（新建弹窗预填、设置页编辑） */
export async function getMyAgentDefaultsAction(): Promise<{ settings: AgentSettings; phrases: string[] }> {
  return getMyAgentDefaults();
}

/** 保存我的统一默认 agent 配置 + 自定义文案库 */
export async function saveMyAgentDefaultsAction(settings: Partial<AgentSettings>, phrases: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await saveMyAgentDefaults(settings, phrases);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** owner 查看 agent 同步上来的工作目录文件 */
export async function getAgentFilesAction(handle: string): Promise<{ ok: boolean; files?: AgentFileView[]; error?: string }> {
  try {
    return { ok: true, files: await listAgentFiles(handle) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载失败" };
  }
}

/** owner 在网页编辑 agent 文件 → 待连接器写回本机 */
export async function saveAgentFileAction(handle: string, path: string, content: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await saveAgentFile(handle, path, content);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** 取 agent 可编辑资料（设置弹窗预填） */
export async function getAgentDetailAction(handle: string): Promise<
  { ok: true; detail: { name: string; persona: string; avatarHue: number; avatarUrl: string | null; agentKind: string; settings: AgentSettings } } | { ok: false; error: string }
> {
  try {
    return { ok: true, detail: await getAgentDetail(handle) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "加载失败" };
  }
}

/** 当前请求的站点地址（生成连接器命令用） */
async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/** 单个操作系统下的一套连接命令（启动/重启/停止）。命令均带 --dir 固定工作目录，与 cwd 无关。 */
export interface OsConnectorCommands {
  /** 下载连接器到用户主目录的固定路径 */
  download: string;
  /** 前台运行（关终端即离线，调试用） */
  foreground: string;
  /** 后台常驻（pm2，关终端/重启电脑都不掉线），多行 */
  daemon: string;
  /** 后台重启 / 停止（pm2） */
  restartDaemon: string;
  stopDaemon: string;
  /** 开机自启（一次性） */
  bootPersist: string;
}

/** 一个 agent 的全套连接命令，按操作系统分两套（macOS/Linux 与 Windows PowerShell）。 */
export interface ConnectorCommand {
  handle: string;
  /** local-claude | local-codex | local-gemini | local-qwen */
  agentKind: string;
  /** macOS / Linux（bash/zsh） */
  mac: OsConnectorCommands;
  /** Windows（PowerShell） */
  win: OsConnectorCommands;
}

/** agentKind → 连接器 --backend 标志（local-claude 为默认，无需标志） */
function backendFlag(agentKind: string): string {
  if (agentKind === "local-codex") return " --backend codex";
  if (agentKind === "local-gemini") return " --backend gemini";
  if (agentKind === "local-qwen") return " --backend qwen";
  return "";
}

/** 与 cwd 无关的连接器开关（两套命令共用） */
function connectorFlags(agentKind: string, settings?: AgentSettings): string {
  return (
    backendFlag(agentKind) +
    (settings?.fullAuto ? " --full-auto" : "") +
    (settings?.isolate ? " --isolate" : "") +
    // 本地 Claude 默认优先会员订阅登录（剥离 ANTHROPIC_API_KEY，避免误走 API 计费）；显式关掉才用 API
    (agentKind === "local-claude" && settings?.claudeUseSubscription !== false ? " --claude-subscription" : "") +
    (settings?.model ? ` --model ${settings.model}` : "")
  );
}

/** macOS / Linux 一套（bash/zsh，~ 由 shell 展开） */
function macCommands(token: string, base: string, handle: string, flags: string): OsConnectorCommands {
  const script = "~/starport-agent.mjs";
  const dir = `~/starport-agents/${handle}`;
  const pm = `agent-${handle}`;
  const args = `--url ${base} --token ${token} --dir ${dir}${flags}`;
  return {
    download: `curl -fsSL ${base}/api/agent-connector -o ${script}`,
    foreground: `node ${script} ${args}`,
    daemon: [`npm i -g pm2`, `pm2 start node --name ${pm} -- ${script} ${args}`, `pm2 save`].join("\n"),
    restartDaemon: `pm2 restart ${pm}`,
    stopDaemon: `pm2 stop ${pm}`,
    bootPersist: `pm2 startup`,
  };
}

/** Windows 一套（PowerShell，$HOME 展开；curl.exe 避开 PowerShell 的 curl 别名；npm 全局 bin 是 .cmd） */
function winCommands(token: string, base: string, handle: string, flags: string): OsConnectorCommands {
  const script = `"$HOME\\starport-agent.mjs"`;
  const dir = `"$HOME\\starport-agents\\${handle}"`;
  const pm = `agent-${handle}`;
  const args = `--url ${base} --token ${token} --dir ${dir}${flags}`;
  return {
    download: `curl.exe -fsSL ${base}/api/agent-connector -o "$HOME\\starport-agent.mjs"`,
    foreground: `node ${script} ${args}`,
    daemon: [`npm i -g pm2`, `pm2 start node --name ${pm} -- ${script} ${args}`, `pm2 save`].join("\n"),
    restartDaemon: `pm2 restart ${pm}`,
    stopDaemon: `pm2 stop ${pm}`,
    // pm2 startup 不支持 Windows，用 pm2-windows-startup 把 pm2 注册成开机自启
    bootPersist: `npm i -g pm2-windows-startup; pm2-startup install`,
  };
}

function commandsFor(token: string, agentKind: string, base: string, handle: string, settings?: AgentSettings): ConnectorCommand {
  const flags = connectorFlags(agentKind, settings);
  return {
    handle,
    agentKind,
    mac: macCommands(token, base, handle, flags),
    win: winCommands(token, base, handle, flags),
  };
}

export interface CreateAgentResult {
  ok: boolean;
  error?: string;
  agent?: CreatedAgent;
  command?: ConnectorCommand;
}

export async function createAgentAction(input: {
  name: string;
  agentKind: AgentKind;
  persona?: string;
  avatarHue?: number;
  avatarUrl?: string | null;
  settings?: Partial<AgentSettings>;
}): Promise<CreateAgentResult> {
  try {
    const agent = await createAgent(input);
    return {
      ok: true,
      agent,
      command: agent.token ? commandsFor(agent.token, agent.agentKind, await origin(), agent.handle, agent.settings) : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

/** 改名（只改展示名） */
export async function renameAgentAction(handle: string, name: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await renameAgent(handle, name);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "改名失败" };
  }
}

/** 更新 agent 资料/设置（名字/人设/头像/可调参数；设置增量合并） */
export async function updateAgentSettingsAction(
  handle: string,
  patch: { name?: string; persona?: string; avatarHue?: number; avatarUrl?: string | null; settings?: Partial<AgentSettings> },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateAgent(handle, patch);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deleteAgentAction(handle: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteAgent(handle);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}

/** 随时取回该 agent 的连接/重启命令（不重置令牌）。历史 agent 无密文时提示需重置。 */
export async function getAgentCommandAction(handle: string): Promise<{ ok: boolean; command?: ConnectorCommand; needsReset?: boolean; error?: string }> {
  try {
    const { token, agentKind, settings } = await getAgentToken(handle);
    return { ok: true, command: commandsFor(token, agentKind, await origin(), handle, settings) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "获取失败";
    if (msg === "__needs_reset__") return { ok: false, needsReset: true, error: "该 Agent 的令牌较早创建，需重置一次才能取回命令" };
    return { ok: false, error: msg };
  }
}

/** 重置令牌并返回新的连接命令（旧令牌即刻失效） */
export async function resetAgentTokenAction(handle: string, _agentKind?: string): Promise<{ ok: boolean; command?: ConnectorCommand; error?: string }> {
  try {
    const { token, agentKind, settings } = await resetAgentToken(handle);
    return { ok: true, command: commandsFor(token, agentKind, await origin(), handle, settings) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "重置失败" };
  }
}

export async function updateAgentPersonaAction(handle: string, persona: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateAgentPersona(handle, persona);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}
