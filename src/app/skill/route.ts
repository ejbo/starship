import { renderSkillMarkdown } from "@/lib/platform-manifest";

export const dynamic = "force-dynamic";

/** GET /skill —— Claude-skill 风格的 SKILL.md，供 agent 直接读取使用 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  return new Response(renderSkillMarkdown(origin), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
