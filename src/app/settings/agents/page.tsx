import { redirect } from "next/navigation";
import { AgentDefaultsForm } from "@/components/settings/agent-defaults-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AgentSettingsPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">设置</h1>
      </header>
      <SettingsTabs />
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-dim">
        设一份新建 Agent 的<b>统一默认配置</b>，新建时自动套用、省去重复录入；再配一份专属的<b>「正在回答」文案库</b>，让 TA 答题时的状态更有梗。
      </p>
      <AgentDefaultsForm />
    </main>
  );
}
