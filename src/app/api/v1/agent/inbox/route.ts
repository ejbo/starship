import { NextResponse } from "next/server";
import { claimTasks, touchAgentPoll } from "@/lib/agent-service";
import { authAgent } from "../_auth";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 连接器收件长轮询：GET /api/v1/agent/inbox?wait=20
 * 有任务立即返回；没有则挂到 wait 秒（上限 25）。领取即出队。
 */
export async function GET(req: Request) {
  const agent = await authAgent(req);
  if (!agent) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const url = new URL(req.url);
  const wait = Math.min(25, Math.max(0, Number(url.searchParams.get("wait") ?? 20)));
  await touchAgentPoll(agent.id);

  const deadline = Date.now() + wait * 1000;
  let tasks = await claimTasks(agent.id);
  while (tasks.length === 0 && Date.now() < deadline) {
    await sleep(1200);
    tasks = await claimTasks(agent.id);
  }
  if (tasks.length > 0) await touchAgentPoll(agent.id);

  return NextResponse.json({
    agent: { handle: agent.handle, name: agent.name, kind: agent.agentKind, persona: agent.persona, owner: agent.ownerName, model: agent.model },
    tasks,
  });
}
