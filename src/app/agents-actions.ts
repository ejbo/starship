"use server";

import { headers } from "next/headers";
import {
  createAgent,
  deleteAgent,
  resetAgentToken,
  updateAgentPersona,
  type AgentKind,
  type CreatedAgent,
} from "@/lib/agent-service";

/** 当前请求的站点地址（生成连接器命令用） */
async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export interface ConnectorCommand {
  download: string;
  run: string;
}

function commandsFor(token: string, backend: string, base: string): ConnectorCommand {
  const backendFlag = backend === "local-codex" ? " --backend codex" : "";
  return {
    download: `curl -fsSL ${base}/api/agent-connector -o starport-agent.mjs`,
    run: `node starport-agent.mjs --url ${base} --token ${token}${backendFlag}`,
  };
}

export interface CreateAgentResult {
  ok: boolean;
  error?: string;
  agent?: CreatedAgent;
  command?: ConnectorCommand;
}

export async function createAgentAction(input: { name: string; agentKind: AgentKind; persona?: string }): Promise<CreateAgentResult> {
  try {
    const agent = await createAgent(input);
    return {
      ok: true,
      agent,
      command: agent.token ? commandsFor(agent.token, agent.agentKind, await origin()) : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
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

/** 重置令牌并返回新的连接命令（旧令牌即刻失效） */
export async function resetAgentTokenAction(handle: string, agentKind: string): Promise<{ ok: boolean; command?: ConnectorCommand; error?: string }> {
  try {
    const token = await resetAgentToken(handle);
    return { ok: true, command: commandsFor(token, agentKind, await origin()) };
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
