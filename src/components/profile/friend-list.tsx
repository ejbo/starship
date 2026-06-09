import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import type { Friend, PresenceKind } from "@/lib/types";

const presenceMeta: Record<PresenceKind, { dot: string; label: (d?: string) => string; tone: string }> = {
  online: { dot: "bg-accent", label: () => "在线", tone: "text-accent" },
  using: { dot: "bg-green", label: (d) => `正在使用 ${d}`, tone: "text-green" },
  meeting: { dot: "bg-purple", label: (d) => d ?? "会议中", tone: "text-purple" },
  offline: { dot: "bg-mute", label: () => "离线", tone: "text-mute" },
};

export function FriendList({ friends }: { friends: Friend[] }) {
  return (
    <div className="capsule p-5">
      <h3 className="mb-3 text-sm font-semibold">
        好友
        <span className="ml-2 text-xs font-normal text-mute">
          {friends.filter((f) => f.presence.kind !== "offline").length}/{friends.length} 在线
        </span>
      </h3>
      <ul className="space-y-3">
        {friends.map((friend) => {
          const meta = presenceMeta[friend.presence.kind];
          const offline = friend.presence.kind === "offline";
          return (
            <li key={friend.handle} className="flex items-center gap-2.5">
              <span className="relative">
                <Avatar name={friend.name} hue={friend.avatarHue} size="sm" className={cn(offline && "opacity-45")} />
                <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-panel", meta.dot)} />
              </span>
              <div className="min-w-0 leading-tight">
                <p className={cn("truncate text-sm", offline ? "text-mute" : "text-ink")}>
                  {friend.name}
                  <span className="ml-1.5 text-[10px] text-mute">Lv.{friend.level}</span>
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
