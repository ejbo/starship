"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ShieldCheck } from "lucide-react";
import {
  chatAction,
  identityAction,
  storageGetAction,
  storageSetAction,
  unlockAction,
} from "@/app/run/[slug]/run-actions";

interface RpcMessage {
  source: string;
  id: string;
  method: string;
  params?: { prompt?: string; key?: string; value?: string };
}

interface LogEntry {
  dir: "in" | "out";
  text: string;
}

/**
 * App Runtime 主机桥：在沙箱 iframe 中加载应用，经 postMessage 注入 Platform SDK。
 * 应用通过 SDK 请求身份/AI/存储，主机侧用 Server Actions 代理；
 * 应用全程接触不到用户的 API Key（仅服务端解密用于调用）。
 */
export function RunSandbox({ slug, entryUrl, appName }: { slug: string; entryUrl: string; appName: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    const append = (entry: LogEntry) => setLog((l) => [...l.slice(-30), entry]);

    const reply = (id: string, result: unknown, error?: string) => {
      iframeRef.current?.contentWindow?.postMessage(
        { source: "starport-host", id, result, error },
        "*",
      );
    };

    const onMessage = async (event: MessageEvent) => {
      const data = event.data as RpcMessage | undefined;
      if (!data || data.source !== "starport-sdk") return;
      // 仅信任本 iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;

      const { id, method, params } = data;
      append({ dir: "in", text: `→ ${method}${params?.prompt ? `("${truncate(params.prompt)}")` : params?.key ? `("${params.key}")` : ""}` });

      try {
        switch (method) {
          case "ready": {
            const ident = await identityAction();
            reply(id, { ok: true, user: ident });
            append({ dir: "out", text: `← 握手完成，身份：${ident.name}` });
            break;
          }
          case "identity.get": {
            const ident = await identityAction();
            reply(id, ident);
            append({ dir: "out", text: `← identity: ${ident.name} (@${ident.handle})` });
            break;
          }
          case "ai.chat": {
            const res = await chatAction(slug, params?.prompt ?? "");
            reply(id, res);
            append({ dir: "out", text: `← ai.chat via ${res.via}` });
            break;
          }
          case "storage.get": {
            const value = await storageGetAction(slug, params?.key ?? "");
            reply(id, { value });
            append({ dir: "out", text: `← storage.get ${params?.key} = ${value ?? "∅"}` });
            break;
          }
          case "storage.set": {
            await storageSetAction(slug, params?.key ?? "", params?.value ?? "");
            reply(id, { ok: true });
            append({ dir: "out", text: `← storage.set ${params?.key} ✓` });
            break;
          }
          case "achievements.unlock": {
            const res = await unlockAction(slug, params?.key ?? "");
            reply(id, res);
            append({ dir: "out", text: `← 成就「${res.name}」${res.unlocked ? "已解锁 🏆" : "此前已解锁"}` });
            break;
          }
          default:
            reply(id, null, `未知方法 ${method}`);
        }
      } catch (e) {
        reply(id, null, e instanceof Error ? e.message : "调用失败");
        append({ dir: "out", text: `← 错误：${e instanceof Error ? e.message : "调用失败"}` });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [slug]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      {/* 应用画面（沙箱 iframe） */}
      <div className="overflow-hidden rounded-b-lg border border-t-0 border-line bg-white">
        <iframe
          ref={iframeRef}
          src={entryUrl}
          title={appName}
          sandbox="allow-scripts allow-forms"
          className="h-[60vh] w-full"
        />
      </div>

      {/* SDK 活动监视器 */}
      <aside className="rounded-lg border border-line bg-panel p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeftRight className="size-4 text-accent" /> SDK 桥接监视器
        </h3>
        <p className="mb-3 flex items-center gap-1 text-[11px] text-mute">
          <ShieldCheck className="size-3 text-free" /> 应用经 SDK 请求，主机侧代理，Key 不出服务端
        </p>
        <div className="h-[52vh] space-y-1 overflow-y-auto font-mono text-[11px] leading-relaxed">
          {log.length === 0 ? (
            <p className="text-mute">等待应用调用 SDK……</p>
          ) : (
            log.map((entry, i) => (
              <p key={i} className={entry.dir === "in" ? "text-accent" : "text-dim"}>
                {entry.text}
              </p>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function truncate(s: string): string {
  return s.length > 16 ? s.slice(0, 16) + "…" : s;
}
