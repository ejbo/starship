import { KeyRound, ShieldCheck } from "lucide-react";
import { describeCapability } from "@/lib/catalog";

/** 运行环境：Steam"配置要求"的星港版 */
export function CapabilityList({ capabilities }: { capabilities: string[] }) {
  if (capabilities.length === 0) {
    return (
      <div className="capsule p-5 text-sm text-dim hover:translate-y-0">
        <h3 className="mb-2 flex items-center gap-1.5 font-semibold text-ink">
          <ShieldCheck className="size-4 text-teal" /> 运行环境
        </h3>
        无需任何授权 —— 开箱即看。
      </div>
    );
  }

  return (
    <div className="capsule space-y-3 p-5 hover:translate-y-0">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <KeyRound className="size-4 text-gold" /> 运行环境
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
        获取时将逐项请求你的授权；所有 AI 调用经星港 Gateway 代理，应用方无法接触你的 API Key。
      </p>
    </div>
  );
}
