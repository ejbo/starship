"use server";

import { redirect } from "next/navigation";
import { issueAuthCode } from "@/lib/oauth-service";
import { getSessionUserId } from "@/lib/session";

/**
 * 用户同意授权：生成 code 并按 OAuth2 重定向回 redirect_uri。
 * 若未提供 redirect_uri（手动测试），跳到展示页显示 code。
 */
export async function approveAction(formData: FormData) {
  const userId = await getSessionUserId();
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  const scopes = String(formData.get("scope") ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  const code = await issueAuthCode(clientId, userId, scopes);

  if (redirectUri) {
    const sep = redirectUri.includes("?") ? "&" : "?";
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : "";
    redirect(`${redirectUri}${sep}code=${encodeURIComponent(code)}${stateParam}`);
  }
  redirect(`/oauth/authorize/granted?code=${encodeURIComponent(code)}`);
}
