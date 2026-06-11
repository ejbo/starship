import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/cn";

/**
 * 渲染评测等用户输入的 Markdown。流水线：remark-gfm → rehype-sanitize（清洗，
 * 防 XSS）。样式复用全局 .richtext 规则（无需 typography 插件）。
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("richtext", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          // 外链一律新标签 + 安全 rel，杜绝反向标签劫持
          a: ({ node, href, ...props }) => {
            const h = typeof href === "string" ? href : "";
            const external = /^(https?:)?\/\//i.test(h);
            return external ? (
              <a href={h} target="_blank" rel="noopener noreferrer nofollow" {...props} />
            ) : (
              <a href={h} {...props} />
            );
          },
          img: ({ node, src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
