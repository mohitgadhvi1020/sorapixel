"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef } from "react";

interface TiptapEditorProps {
  content: Record<string, unknown> | null;
  onChange: (json: Record<string, unknown>) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
        active
          ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d]"
          : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function TiptapEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = "Start writing your blog post...",
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-[#c4a67d] underline" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: content || undefined,
    onUpdate: ({ editor: e }) => {
      if (!isExternalUpdate.current) {
        onChange(e.getJSON() as Record<string, unknown>);
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[300px] px-4 py-3 outline-none " +
          "prose-headings:font-semibold prose-headings:text-white " +
          "prose-p:text-[rgba(255,255,255,0.7)] prose-p:leading-relaxed " +
          "prose-strong:text-white prose-em:text-[rgba(255,255,255,0.8)] " +
          "prose-code:bg-[rgba(255,255,255,0.06)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded " +
          "prose-blockquote:border-l-[#c4a67d] prose-blockquote:text-[rgba(255,255,255,0.5)] " +
          "prose-img:rounded-xl prose-img:border prose-img:border-[rgba(255,255,255,0.08)] " +
          "prose-a:text-[#c4a67d] prose-a:underline " +
          "prose-ul:text-[rgba(255,255,255,0.7)] prose-ol:text-[rgba(255,255,255,0.7)]",
      },
    },
  });

  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(content || { type: "doc", content: [] });
    if (current !== incoming) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content || { type: "doc", content: [] });
      isExternalUpdate.current = false;
    }
  }, [editor, content]);

  const addImage = useCallback(async () => {
    if (!editor || !onImageUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        editor.chain().focus().setImage({ src: url }).run();
      } catch {
        /* upload failed */
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>

        <div className="w-px h-5 bg-[rgba(255,255,255,0.06)] mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <div className="w-px h-5 bg-[rgba(255,255,255,0.06)] mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
            <text x="2" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
            <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
            <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" />
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 .001 0 1 1 1z" />
          </svg>
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>

        <div className="w-px h-5 bg-[rgba(255,255,255,0.06)] mx-1" />

        <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="Link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </ToolbarButton>

        {onImageUpload && (
          <ToolbarButton onClick={addImage} title="Insert Image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </ToolbarButton>
        )}

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
