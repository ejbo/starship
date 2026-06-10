import "server-only";
import { NextResponse } from "next/server";
import { resolveAccessToken, type ResolvedToken, type Scope } from "@/lib/oauth-service";

/** 从 Authorization: Bearer 解析并校验访问令牌 */
export async function authenticate(req: Request): Promise<ResolvedToken | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return resolveAccessToken(match[1].trim());
}

export function jsonError(status: number, error: string, description?: string) {
  return NextResponse.json({ error, error_description: description }, { status });
}

export function requireScope(token: ResolvedToken, scope: Scope): boolean {
  return token.scopes.includes(scope);
}
