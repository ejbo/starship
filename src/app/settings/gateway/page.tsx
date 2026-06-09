import { Check, Trash2, X } from "lucide-react";
import { AddCredentialForm } from "@/components/settings/add-credential-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getProductIcon } from "@/lib/icons";
import { providerMeta } from "@/lib/providers";
import { getProviderCoverage, listCredentials } from "@/lib/gateway-service";
import { deleteCredentialAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function GatewayPage() {
  const [credentials, coverage] = await Promise.all([listCredentials(), getProviderCoverage()]);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">设置</h1>
      </header>
      <SettingsTabs />

      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-dim">
        在这里配置一次 API 密钥，平台上所有声明需要对应能力的应用即可经你授权直接使用 ——
        无需在每个应用里重复填写，原始密钥也永远不会暴露给应用方。
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* 左：已配置密钥 + 覆盖情况 */}
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold">已配置的密钥</h2>
            {credentials.length === 0 ? (
              <div className="capsule p-5 text-sm text-dim">还没有配置任何密钥，从右侧添加一个开始。</div>
            ) : (
              <ul className="space-y-2.5">
                {credentials.map((c) => {
                  const meta = providerMeta(c.provider);
                  const Icon = getProductIcon(meta.icon);
                  return (
                    <li key={c.id} className="capsule flex items-center gap-3 p-4">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-md"
                        style={{ background: `hsl(${meta.hue} 60% 94%)`, color: `hsl(${meta.hue} 50% 40%)` }}
                      >
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {meta.name} <span className="text-dim">· {c.label}</span>
                        </p>
                        <p className="text-xs text-mute">
                          ····{c.last4} ·{" "}
                          {c.dailyTokenLimit
                            ? `日限额 ${c.dailyTokenLimit.toLocaleString("zh-CN")} tokens`
                            : "不限额度"}
                        </p>
                      </div>
                      <form action={deleteCredentialAction} className="ml-auto">
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md p-2 text-mute transition-colors hover:bg-danger/8 hover:text-danger"
                          aria-label="删除密钥"
                          title="删除"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold">平台应用需要的 Provider</h2>
            <p className="mb-3 text-xs text-mute">配置后，下列数字代表的那些应用就能直接调用，无需再单独授权填写。</p>
            <ul className="space-y-2.5">
              {coverage.map((cov) => {
                const meta = providerMeta(cov.provider);
                const Icon = getProductIcon(meta.icon);
                return (
                  <li key={cov.provider} className="capsule flex items-center gap-3 p-4">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-md"
                      style={{ background: `hsl(${meta.hue} 60% 94%)`, color: `hsl(${meta.hue} 50% 40%)` }}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{meta.name}</p>
                      <p className="text-xs text-mute">{cov.appCount} 个应用需要</p>
                    </div>
                    <span className="ml-auto">
                      {cov.configured ? (
                        <span className="flex items-center gap-1 rounded-md bg-free/8 px-2.5 py-1 text-xs font-medium text-free">
                          <Check className="size-3.5" /> 已配置
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-md bg-card-hi px-2.5 py-1 text-xs font-medium text-mute">
                          <X className="size-3.5" /> 未配置
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* 右：添加表单 */}
        <div className="lg:sticky lg:top-18 lg:self-start">
          <AddCredentialForm />
        </div>
      </div>
    </main>
  );
}
