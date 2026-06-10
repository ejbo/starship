import { NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/oauth-service";
import { jsonError } from "@/lib/api-auth";

/** POST /api/v1/oauth/token  { client_id, client_secret, code } → { access_token, scope } */
export async function POST(req: Request) {
  let body: { client_id?: string; client_secret?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "请求体需为 JSON");
  }
  const { client_id, client_secret, code } = body;
  if (!client_id || !client_secret || !code) {
    return jsonError(400, "invalid_request", "缺少 client_id / client_secret / code");
  }

  try {
    const result = await exchangeCodeForToken(client_id, client_secret, code);
    return NextResponse.json({
      access_token: result.accessToken,
      token_type: "Bearer",
      scope: result.scopes.join(" "),
    });
  } catch (e) {
    return jsonError(400, e instanceof Error ? e.message : "invalid_grant");
  }
}
