"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

interface BlogRendererProps {
  content: Record<string, unknown> | null;
}

export default function BlogRenderer({ content }: BlogRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: true }),
    ],
    content: content || undefined,
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none " +
          "prose-headings:font-display prose-headings:font-bold prose-headings:text-[#0a0a0a] prose-headings:tracking-tight " +
          "prose-h2:text-[1.75rem] prose-h2:mt-10 prose-h2:mb-4 " +
          "prose-h3:text-[1.35rem] prose-h3:mt-8 prose-h3:mb-3 " +
          "prose-p:text-[#4a4a4a] prose-p:text-[16px] prose-p:leading-[1.8] prose-p:mb-5 " +
          "prose-strong:text-[#0a0a0a] prose-em:text-[#4a4a4a] " +
          "prose-a:text-[#8b7355] prose-a:underline prose-a:decoration-[#8b7355]/30 hover:prose-a:decoration-[#8b7355] " +
          "prose-blockquote:border-l-[#8b7355] prose-blockquote:bg-[#f7f7f5] prose-blockquote:rounded-r-xl prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:text-[#4a4a4a] prose-blockquote:not-italic " +
          "prose-img:rounded-2xl prose-img:border prose-img:border-[#e8e5df] prose-img:shadow-sm " +
          "prose-code:bg-[#f7f7f5] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#8b7355] prose-code:text-sm " +
          "prose-pre:bg-[#1a1a1a] prose-pre:rounded-xl prose-pre:border prose-pre:border-[#e8e5df] " +
          "prose-ul:text-[#4a4a4a] prose-ol:text-[#4a4a4a] prose-li:text-[16px] prose-li:leading-[1.8] " +
          "prose-hr:border-[#e8e5df]",
      },
    },
  });

  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
