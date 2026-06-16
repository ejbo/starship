import { NextResponse } from "next/server";
import { syncAgentFiles } from "@/lib/agent-service";
import { authAgent } from "../_auth";

export const dynamic = "force-dynamic";

/**
 * 连接器文件同步：POST /api/v1/agent/files
 * body: { files: [{path, content}], acked: [path] }
 * - files：本机当前文件内容（网页有未写回编辑的文件不会被覆盖）
 * - acked：已写回本机磁盘的路径（清除其 pendingPush）
 * 返回 { pending: [{path, content}] }：仍待连接器写回本机的网页编辑。
 */
export async function POST(req: Request) {
  const agent = await authAgent(req);
  if (!agent) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  let payload: { files?: { path: string; content: string }[]; acked?: string[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const files = Array.isArray(payload.files)
    ? payload.files.filter((f) => f && typeof f.path === "string" && typeof f.content === "string")
    : [];
  const acked = Array.isArray(payload.acked) ? payload.acked.filter((p): p is string => typeof p === "string") : [];

  const pending = await syncAgentFiles(agent.id, files, acked);
  return NextResponse.json({ pending: pending.map((p) => ({ path: p.path, content: p.content })) });
}
