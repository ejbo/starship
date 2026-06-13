import "server-only";
import { authAgentToken, type AgentIdentity } from "@/lib/agent-service";

/** Authorization: Bearer spa_xxx → agent 身份（连接器专用，与应用 OAuth 体系分离） */
export async function authAgent(req: Request): Promise<AgentIdentity | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return authAgentToken(match[1].trim());
}
