import { NextResponse } from "next/server";
import { setAgentActivity } from "@/lib/agent-service";
import { authAgent } from "../_auth";

export const dynamic = "force-dynamic";

/** 连接器上报富状态：POST { detail: "正在处理：xxx" }；空字符串清除 */
export async function POST(req: Request) {
  const agent = await authAgent(req);
  if (!agent) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  let payload: { detail?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  await setAgentActivity(agent.id, payload.detail ?? "");
  return NextResponse.json({ ok: true });
}
