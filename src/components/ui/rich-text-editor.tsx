"use client";

// 轻量富文本编辑器：Markdown 进 / Markdown 出，可直接喂给原有 body 字段与
// Markdown 渲染管线。基于 Tiptap v2 + tiptap-markdown，工具栏含加粗/斜体/删除线/
// 行内代码/标题/列表/引用/链接/撤销重做。专注文本（评测场景），不含图片上传。

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

function TBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // 保持编辑器选区
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-accent/12 text-accent" : "text-dim hover:bg-card-hi hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px self-center bg-line" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const icon = "size-4";
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("链接地址", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-page/60 px-1.5 py-1">
      <TBtn title="加粗" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className={icon} />
      </TBtn>
      <TBtn title="斜体" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className={icon} />
      </TBtn>
      <TBtn title="删除线" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className={icon} />
      </TBtn>
      <TBtn title="行内代码" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className={icon} />
      </TBtn>
      <Divider />
      <TBtn title="标题" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className={icon} />
      </TBtn>
      <TBtn title="小标题" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className={icon} />
      </TBtn>
      <Divider />
      <TBtn title="无序列表" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className={icon} />
      </TBtn>
      <TBtn title="有序列表" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className={icon} />
      </TBtn>
      <TBtn title="引用" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className={icon} />
      </TBtn>
      <TBtn title="链接" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon className={icon} />
      </TBtn>
      <Divider />
      <TBtn title="撤销" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className={icon} />
      </TBtn>
      <TBtn title="重做" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className={icon} />
      </TBtn>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, disabled = false, className, ariaLabel }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    immediatelyRender: false, // App Router SSR 安全
    editable: !disabled,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      Markdown.configure({ html: false, transformPastedText: true, breaks: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "richtext min-h-[6rem] px-3 py-2",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.storage.markdown.getMarkdown()),
  });

  // 外部 value 变化（如表单重置）时同步，不触发 onUpdate 以免打断输入
  useEffect(() => {
    if (!editor) return;
    const current = editor.storage.markdown.getMarkdown();
    if (value !== current) editor.commands.setContent(value || "", false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return <div className={cn("min-h-[8.5rem] rounded-md border border-line bg-page", className)} aria-busy />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-line bg-page transition-colors focus-within:border-accent",
        disabled && "opacity-60",
        className,
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
