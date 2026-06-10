import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

/** 无 redirect_uri 时的授权码展示页（手动测试用） */
export default async function GrantedPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="capsule p-6 text-center">
        <Check className="mx-auto mb-2 size-7 text-free" />
        <h1 className="text-lg font-bold">授权成功</h1>
        <p className="mt-1 text-sm text-dim">把下面的授权码交给应用，换取访问令牌：</p>
        <code className="mt-3 block break-all rounded-md border border-line bg-page px-3 py-2 font-mono text-xs text-ink">
          {code ?? "（无）"}
        </code>
        <p className="mt-3 text-[11px] text-mute">应用用 POST /api/v1/oauth/token（client_id + client_secret + code）兑换。10 分钟内有效。</p>
      </div>
    </div>
  );
}
