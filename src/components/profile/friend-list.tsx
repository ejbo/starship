import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

const presenceMeta: Record<PresenceKind, { dot: string; label: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-aurora", label: () => "在线", tone: "text-aurora" },
  using: { dot: "bg-teal", label: (d) => `正在使用 ${d}`, tone: "text-teal" },
  meeting: { dot: "bg-nebula", label: (d) => d ?? "会议中", tone: "text-nebula" },
  offline: { dot: "bg-mute", label: () => "离线", tone: "text-mute" },
};

export function FriendList({ friends }: { friends: Friend[] }) {
  return (
    <div className="capsule p-5 hover:translate-y-0">
      <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold">
        好友
        <span className="font-display text-[10px] tracking-[0.25em] text-mute">
          {friends.filter((f) => f.presence.kind !== "offline").length}/{friends.length} 在线
        </span>
      </h3>
      <ul className="space-y-3">
        {friends.map((friend) => {
          const meta = presenceMeta[friend.presence.kind];
          return (
            <li key={friend.handle} className="flex items-center gap-2.5">
              <span className="relative">
                <Avatar name={friend.name} hue={friend.avatarHue} size="sm" className={cn(friend.presence.kind === "offline" && "opacity-50")} />
                <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-abyss", meta.dot)} />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={cn("truncate text-sm", friend.presence.kind === "offline" ? "text-mute" : "text-ink")}>
                  {friend.name}
                  <span className="ml-1.5 font-display text-[10px] text-mute">Lv.{friend.level}</span>
                </p>
                <p className={cn("truncate text-[11px]", meta.tone)}>{meta.label(friend.presence.detail)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
