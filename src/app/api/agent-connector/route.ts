import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

/** 分发本地连接器脚本：curl -fsSL <host>/api/agent-connector -o starport-agent.mjs */
export async function GET() {
  const file = await readFile(join(process.cwd(), "scripts", "starport-agent.mjs"), "utf8");
  return new Response(file, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Disposition": 'attachment; filename="starport-agent.mjs"',
      "Cache-Control": "no-store",
    },
  });
}
