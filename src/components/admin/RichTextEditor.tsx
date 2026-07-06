import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link2, Link2Off, Image as ImageIcon, Highlighter, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, Pilcrow, Loader2, Minus, Video,
  Table as TableIcon, Rows3, Columns3, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadBlogImage } from "@/lib/admin-queries";
import { formatBytes } from "@/lib/media-compress";
import { VideoEmbed, toEmbedUrl } from "@/lib/tiptap-video";

const FONTS = [
  { label: "Default", value: "" },
  { label: "Sans (DM Sans)", value: "'DM Sans', sans-serif" },
  { label: "Display (Space Grotesk)", value: "'Space Grotesk', sans-serif" },
  { label: "Serif (Georgia)", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, 'Courier New', monospace" },
];

const COLORS = ["#18181B", "#7C3AED", "#DC2626", "#16A34A", "#2563EB", "#EA580C", "#DB2777"];

interface Props {
  value: string;
  onChange: (html: string) => void;
}

function Divider() {
  return <span className="mx-0.5 h-6 w-px bg-border" />;
}

function TBtn({
  active, onClick, title, disabled, children,
}: {
  active?: boolean; onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const insertImage = useCallback(
    async (file: File | undefined) => {
      if (!file || uploadingRef.current) return;
      uploadingRef.current = true;
      const t = toast.loading(`Compressing & uploading (${formatBytes(file.size)})…`);
      try {
        const url = await uploadBlogImage(file);
        const alt = window.prompt("Image alt text (for SEO & accessibility):", "") || "";
        editor.chain().focus().setImage({ src: url, alt }).run();
        toast.success("Image added", { id: t });
      } catch (e) {
        toast.error((e as Error).message, { id: t });
      } finally {
        uploadingRef.current = false;
      }
    },
    [editor],
  );

  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…):", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    let href = url.trim();
    if (!/^(https?:|mailto:|tel:|\/|#)/i.test(href)) href = `https://${href}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }, [editor]);

  const insertVideo = useCallback(() => {
    const raw = window.prompt(
      "Paste a video link (YouTube, Vimeo, Loom, Wistia, Dailymotion):",
      "",
    );
    if (!raw) return;
    const src = toEmbedUrl(raw);
    if (!src) {
      toast.error("Unsupported video link. Use YouTube, Vimeo, Loom, Wistia or Dailymotion.");
      return;
    }
    (editor.chain().focus() as unknown as { setVideoEmbed: (o: { src: string }) => { run: () => void } })
      .setVideoEmbed({ src })
      .run();
  }, [editor]);

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-card/95 p-1.5 backdrop-blur">
      <TBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}><Undo2 className="h-4 w-4" /></TBtn>
      <TBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}><Redo2 className="h-4 w-4" /></TBtn>
      <Divider />

      <select
        title="Font"
        value={editor.getAttributes("textStyle").fontFamily || ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontFamily(v).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        className="h-8 rounded-md border bg-background px-2 text-xs"
      >
        {FONTS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
      </select>
      <Divider />

      <TBtn title="Paragraph" active={editor.isActive("paragraph") && !editor.isActive("heading")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow className="h-4 w-4" /></TBtn>
      <TBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></TBtn>
      <TBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></TBtn>
      <Divider />

      <TBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></TBtn>
      <TBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></TBtn>
      <TBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></TBtn>
      <TBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></TBtn>
      <TBtn title="Highlight" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></TBtn>
      <Divider />

      {/* Text color swatches */}
      <div className="flex items-center gap-0.5 px-0.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={`Color ${c}`}
            aria-label={`Text color ${c}`}
            onClick={() => editor.chain().focus().setColor(c).run()}
            className="h-5 w-5 rounded-full border shadow-sm"
            style={{ backgroundColor: c }}
          />
        ))}
        <TBtn title="Clear color" onClick={() => editor.chain().focus().unsetColor().run()}><Minus className="h-4 w-4" /></TBtn>
      </div>
      <Divider />

      <TBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></TBtn>
      <TBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></TBtn>
      <TBtn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></TBtn>
      <TBtn title="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></TBtn>
      <Divider />

      <TBtn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft className="h-4 w-4" /></TBtn>
      <TBtn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter className="h-4 w-4" /></TBtn>
      <TBtn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight className="h-4 w-4" /></TBtn>
      <Divider />

      <TBtn title="Add / edit link" active={editor.isActive("link")} onClick={setLink}><Link2 className="h-4 w-4" /></TBtn>
      <TBtn title="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Link2Off className="h-4 w-4" /></TBtn>
      <TBtn title="Insert image (auto-compressed)" onClick={() => imgInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></TBtn>
      <TBtn title="Embed video (YouTube, Vimeo, Loom…)" onClick={insertVideo}><Video className="h-4 w-4" /></TBtn>
      <Divider />

      <TBtn title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></TBtn>
      {editor.isActive("table") && (
        <>
          <TBtn title="Add row below" onClick={() => editor.chain().focus().addRowAfter().run()}><Rows3 className="h-4 w-4" /></TBtn>
          <TBtn title="Add column after" onClick={() => editor.chain().focus().addColumnAfter().run()}><Columns3 className="h-4 w-4" /></TBtn>
          <TBtn title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}><Minus className="h-4 w-4" /></TBtn>
          <TBtn title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}><Trash2 className="h-4 w-4" /></TBtn>
        </>
      )}




      <input
        ref={imgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { insertImage(e.target.files?.[0]); e.target.value = ""; }}
      />
    </div>
  );
}

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: false }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-lg" } }),
      VideoEmbed,
      Table.configure({ resizable: false, HTMLAttributes: { class: "blog-table" } }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write your article… use the toolbar for headings, images, links and more." }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose-content min-h-[360px] max-w-none px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Sync external value changes (e.g. loading an existing post) into the editor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && (value || "") !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
