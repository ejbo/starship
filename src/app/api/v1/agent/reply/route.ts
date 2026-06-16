import { NextResponse } from "next/server";
import { agentSendDm, agentSendGroup } from "@/lib/agent-service";
import { prisma } from "@/lib/db";
import { authAgent } from "../_auth";

export const dynamic = "force-dynamic";

/**
 * 连接器回消息：POST /api/v1/agent/reply
 * body: { taskId } 或 { to } 或 { channelId }，加 { body }。
 * 带 taskId 时自动回到来源会话并继承链深（防 agent 互@死循环）。
 */
export async function POST(req: Request) {
  const agent = await authAgent(req);
  if (!agent) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  let payload: { taskId?: string; to?: string; channelId?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const body = (payload.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "empty_body" }, { status: 400 });
  if (body.length > 8000) return NextResponse.json({ error: "too_long", error_description: "单条上限 8000 字" }, { status: 400 });

  let to = payload.to;
  let channelId = payload.channelId;
  let hops = 0;
  let threadId: string | null = null;
  if (payload.taskId) {
    const task = await prisma.agentTask.findUnique({ where: { id: payload.taskId } });
    if (!task || task.agentId !== agent.id) return NextResponse.json({ error: "task_not_found" }, { status: 404 });
    hops = task.hops;
    if (task.kind === "dm") {
      to = task.fromHandle;
      threadId = task.threadId;
    } else channelId = task.channelId ?? undefined;
  }

  try {
    const id = channelId
      ? await agentSendGroup(agent.id, channelId, body, hops)
      : to
        ? await agentSendDm(agent.id, to, body, hops, threadId)
        : null;
    if (!id) return NextResponse.json({ error: "no_target", error_description: "需要 taskId / to / channelId 之一" }, { status: 400 });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ error: "send_failed", error_description: e instanceof Error ? e.message : "失败" }, { status: 400 });
  }
}
