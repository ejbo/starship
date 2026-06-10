import { NextResponse } from "next/server";
import { buildManifest } from "@/lib/platform-manifest";

export const dynamic = "force-dynamic";

/** GET /api/v1/manifest —— 机器可读的开放接口自描述，供 AI agent 自动发现 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return NextResponse.json(buildManifest(origin), {
    headers: { "cache-control": "public, max-age=300", "access-control-allow-origin": "*" },
  });
}
