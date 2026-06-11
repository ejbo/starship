import { redirect } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { approveAction } from "./actions";
import { Avatar } from "@/components/ui/avatar";
import { ALL_SCOPES, getAppByClientId, getGrantedScopes, issueAuthCode } from "@/lib/oauth-service";
import { getCurrentUser } from "@/lib/catalog";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const scopeLabels: Record<string, string> = {
  identity: "读取你的公开资料（昵称、头像、等级）",
  "achievements:write": "为你解锁该应用的成就",
  "stats:write": "记录你在该应用的游戏时长与统计",
  "presence:update": "显示你「正在使用该应用」并累计使用时长",
  "gateway:llm": "用你在平台配置的密钥经 Gateway 调用大模型",
};

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; redirect_uri?: string; scope?: string; state?: string }>;
}) {
  const sp = await searchParams;
  const clientId = sp.client_id ?? "";

  const userId = await getSessionUserIdOrNull();
  if (!userId) {
    const back = encodeURIComponent(`/oauth/authorize?client_id=${clientId}&scope=${sp.scope ?? ""}&redirect_uri=${sp.redirect_uri ?? ""}`);
    redirect(`/login?next=${back}`);
  }

  const app = await getAppByClientId(clientId);
  const user = await getCurrentUser();
  const scopes = (sp.scope ?? "identity")
    .split(/[\s,]+/)
    .filter((s) => (ALL_SCOPES as readonly string[]).includes(s));

  // 之前已授权过这个应用（已授予的 scopes 覆盖本次请求）→ 静默放行，不再显示同意页。
  // 实现「授权一次后从平台打开即用、无需每次点同意」。
  if (app && sp.redirect_uri) {
    const granted = await getGrantedScopes(clientId, userId);
    if (granted && scopes.every((s) => granted.includes(s))) {
      const code = await issueAuthCode(clientId, userId, scopes);
      const sep = sp.redirect_uri.includes("?") ? "&" : "?";
      const stateParam = sp.state ? `&state=${encodeURIComponent(sp.state)}` : "";
      redirect(`${sp.redirect_uri}${sep}code=${encodeURIComponent(code)}${stateParam}`);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="capsule p-6">
        {!app ? (
          <p className="text-center text-sm text-danger">无效的 client_id —— 找不到应用。</p>
        ) : (
          <>
            <div className="mb-5 text-center">
              <ShieldCheck className="mx-auto mb-2 size-7 text-accent" />
              <h1 className="text-lg font-bold">授权 {app.name}</h1>
              <p className="mt-1 text-sm text-dim">由 {app.developer} 开发</p>
            </div>

            <div className="mb-4 flex items-center justify-center gap-2 rounded-md bg-card-hi p-3 text-sm">
              {user && <Avatar name={user.name} hue={user.avatarHue} size="sm" />}
              <span>以 <b>{user?.name}</b> 的身份授权</span>
            </div>

            <p className="mb-2 text-xs text-dim">该应用将获得以下权限：</p>
            <ul className="mb-5 space-y-2">
              {scopes.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-free" />
                  <span>{scopeLabels[s] ?? s}</span>
                </li>
              ))}
            </ul>

            <form action={approveAction} className="space-y-2">
              <input type="hidden" name="client_id" value={clientId} />
              <input type="hidden" name="redirect_uri" value={sp.redirect_uri ?? ""} />
              <input type="hidden" name="scope" value={scopes.join(" ")} />
              <input type="hidden" name="state" value={sp.state ?? ""} />
              <button
                type="submit"
                className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
              >
                授权
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-mute">
              授权后应用获得访问令牌，但永远拿不到你的密码或 API Key。
            </p>
          </>
        )}
      </div>
    </div>
  );
}
