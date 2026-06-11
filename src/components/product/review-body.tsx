"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";

const COLLAPSED = 220; // px：超过则折叠渐隐

/** 评测正文：渲染 Markdown，过长则折叠 + 底部渐隐，可展开/收起（仿 Steam）。 */
export function ReviewBody({ body }: { body: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [full, setFull] = useState(0); // 完整内容高度

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setFull(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [body]);

  const overflow = full > COLLAPSED + 24;

  return (
    <div>
      <div
        ref={ref}
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: !overflow || expanded ? full || undefined : COLLAPSED }}
      >
        <Markdown content={body} />
        {overflow && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {overflow && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:text-accent-deep"
        >
          {expanded ? "收起" : "展开全文"}
          <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
