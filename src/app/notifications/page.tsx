import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Coins, ShieldCheck, UserPlus } from "lucide-react";
import { getNotifications, markAllRead } from "@/lib/notification-service";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

const kindIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  review: ShieldCheck,
  earning: Coins,
  friend: UserPlus,
  system: Bell,
};

export default async function NotificationsPage() {
  if (!(await getSessionUserIdOrNull())) redirect("/login");
  const items = await getNotifications();
  await markAllRead(); // 访问通知页即标记全部已读

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold">
        <Bell className="size-6" /> 通知
      </h1>
      {items.length === 0 ? (
        <p className="capsule p-12 text-center text-sm text-dim">还没有通知。有审核结果、收益等会出现在这里。</p>
      ) : (
        <div className="capsule divide-y divide-line">
          {items.map((n) => {
            const Icon = kindIcon[n.kind] ?? Bell;
            const inner = (
              <div className={`flex items-start gap-3 p-4 ${!n.read ? "bg-accent/[0.04]" : ""}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card-hi text-accent">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 grow">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {n.title}
                    {!n.read && <span className="size-1.5 rounded-full bg-accent" />}
                  </p>
                  {n.body && <p className="mt-0.5 text-xs text-dim">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-mute">{n.createdAt.slice(0, 16).replace("T", " ")}</p>
                </div>
              </div>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} className="block transition-colors hover:bg-card-hi/40">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
