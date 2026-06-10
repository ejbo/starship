import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { getEditableProfile } from "@/lib/profile-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const profile = await getEditableProfile();

  return (
    <main className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="mb-2">
        <h1 className="text-2xl font-bold">设置</h1>
      </header>
      <SettingsTabs />
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-dim">
        昵称可随时修改、允许与他人重名；<b>用户名</b>是你登录用的唯一标识，<b>好友码</b>则是别人加你时用的唯一辨识码。
      </p>
      <ProfileForm
        handle={profile.handle}
        friendCode={profile.friendCode}
        name={profile.name}
        signature={profile.signature}
        avatarHue={profile.avatarHue}
        avatarUrl={profile.avatarUrl}
      />
    </main>
  );
}
