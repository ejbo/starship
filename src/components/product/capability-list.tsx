import { KeyRound, ShieldCheck } from "lucide-react";
import { describeCapability } from "@/lib/catalog";

/** 运行要求：该产品声明需要的平台能力与授权 */
export function CapabilityList({ capabilities }: { capabilities: string[] }) {
  if (capabilities.length === 0) {
    return (
      <div className="capsule p-5 text-sm text-dim">
        <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
          <ShieldCheck className="size-4 text-free" /> 运行要求
        </h3>
        无需任何授权 —— 开箱即用。
      </div>
    );
  }

  return (
    <div className="capsule space-y-3 p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <KeyRound className="size-4 text-accent" /> 运行要求
      </h3>
      <ul className="space-y-2.5">
        {capabilities.map((cap) => {
          const { name, note } = describeCapability(cap);
          return (
            <li key={cap} className="text-xs">
              <p className="font-medium text-ink">{name}</p>
              <p className="mt-0.5 text-mute">{note}</p>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line pt-2.5 text-[11px] leading-relaxed text-mute">
        获取时将逐项请求你的授权；所有 AI 调用经平台 Gateway 代理，应用方无法接触你的 API Key。
      </p>
    </div>
  );
}
