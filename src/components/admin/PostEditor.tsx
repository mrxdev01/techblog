import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, X, Plus, Save, Eye, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { categoriesQuery, tagsQuery, authorsQuery } from "@/lib/queries";
import {
  adminPostByIdQuery,
  uploadBlogImage,
  useUpsertPost,
  type PostFormValues,
} from "@/lib/admin-queries";
import { slugify, readingTime, sanitizeHtml, buildToc } from "@/lib/blog-utils";
// Lazy-load the rich-text editor: TipTap + ProseMirror is the single biggest
// dependency in the admin bundle. Splitting it out keeps the editor page's
// initial JS small and shows a skeleton while it streams in.
const RichTextEditor = lazy(() =>
  import("@/components/admin/RichTextEditor").then((m) => ({ default: m.RichTextEditor })),
);

function EditorSkeleton() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-lg border">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * The content editor is isolated in its own memoized component that owns the
 * live HTML in local state. Typing therefore re-renders only this subtree (the
 * editor, toolbar, reading-time hint and preview) instead of the entire post
 * form — eliminating input lag on long articles. Changes are pushed up through
 * a stable `onChange` ref that never triggers a parent re-render.
 */
const ContentEditorCard = memo(function ContentEditorCard({
  initialContent,
  onChange,
}: {
  initialContent: string;
  onChange: (html: string) => void;
}) {
  const [html, setHtml] = useState(initialContent);
  const readMins = useMemo(() => readingTime(html), [html]);
  const preview = useMemo(() => sanitizeHtml(buildToc(html).html), [html]);
  const handle = useCallback(
    (v: string) => {
      setHtml(v);
      onChange(v);
    },
    [onChange],
  );

  return (
    <Tabs defaultValue="write">
      <div className="flex items-center justify-between">
        <Label>Content (HTML supported)</Label>
        <TabsList>
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="write">
        <Suspense fallback={<EditorSkeleton />}>
          <RichTextEditor value={html} onChange={handle} />
        </Suspense>
        <p className="mt-1 text-xs text-muted-foreground">
          {readMins} min read · headings (H2/H3) build the table of contents · images are auto-compressed on upload.
        </p>
      </TabsContent>
      <TabsContent value="preview">
        <div
          className="prose-content min-h-[200px] rounded-lg border p-4"
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      </TabsContent>
    </Tabs>
  );
});
import type { FaqItem } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const EMPTY: PostFormValues = {
  title: "", slug: "", excerpt: "", content: "", featured_image: null, image_alt: null,
  category_id: null, author_id: null, status: "draft", featured: false, trending: false,
  meta_title: null, meta_description: null, focus_keyword: null, canonical_url: null,
  og_title: null, og_description: null, og_image: null, faq_json: [], reading_time: 1,
  published_at: null, tagIds: [],
};

/**
 * A `<input type="datetime-local">` works in the browser's LOCAL time, but we
 * store `published_at` as a UTC ISO string. Converting naively (slicing the
 * ISO string) showed the UTC time in the local field — so the clock looked
 * "wrong" and there was no easy way to pick the current moment. These helpers
 * bridge the two correctly.
 */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const localMs = d.getTime() - d.getTimezoneOffset() * 60_000;
  return new Date(localMs).toISOString().slice(0, 16);
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value); // browser parses this as local time
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function PostEditor({ postId }: { postId: string }) {
  const navigate = useNavigate();
  const isNew = postId === "new";
  const upsert = useUpsertPost();

  const { data: categories = [] } = useQuery(categoriesQuery());
  const { data: allTags = [] } = useQuery(tagsQuery());
  const { data: authors = [] } = useQuery(authorsQuery());
  const { data: existing, isLoading } = useQuery(adminPostByIdQuery(postId));

  const [form, setForm] = useState<PostFormValues>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [newTag, setNewTag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Live editor HTML kept in a ref so typing never re-renders this big form.
  const contentRef = useRef<string>("");
  const onContentChange = useCallback((html: string) => {
    contentRef.current = html;
  }, []);

  useEffect(() => {
    if (existing) {
      setForm({
        id: existing.id,
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt ?? "",
        content: existing.content ?? "",
        featured_image: existing.featured_image,
        image_alt: existing.image_alt,
        category_id: existing.category_id,
        author_id: existing.author_id,
        status: existing.status,
        featured: existing.featured,
        trending: existing.trending,
        meta_title: existing.meta_title,
        meta_description: existing.meta_description,
        focus_keyword: existing.focus_keyword,
        canonical_url: existing.canonical_url,
        og_title: existing.og_title,
        og_description: existing.og_description,
        og_image: existing.og_image,
        faq_json: existing.faq_json ?? [],
        reading_time: existing.reading_time ?? 1,
        published_at: existing.published_at,
        tagIds: existing.tags.map((t) => t.id),
      });
      contentRef.current = existing.content ?? "";
      setSlugTouched(true);
    }
  }, [existing]);

  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Auto slug from title (only until the user edits the slug).
  useEffect(() => {
    if (!slugTouched && form.title) set("slug", slugify(form.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, slugTouched]);

  async function onUpload(file: File | undefined, target: "featured_image" | "og_image") {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBlogImage(file);
      set(target, url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function addTagByName(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const existingTag = allTags.find((t) => t.name.toLowerCase() === clean.toLowerCase());
    if (existingTag && !form.tagIds.includes(existingTag.id)) {
      set("tagIds", [...form.tagIds, existingTag.id]);
    } else if (!existingTag) {
      toast.info("Create this tag first in the Taxonomy page, then add it here.");
    }
    setNewTag("");
  }

  async function save(status: "draft" | "published") {
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.slug.trim()) return toast.error("Slug is required.");
    const content = contentRef.current;
    const contentIsBlank = content.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s+/g, "").trim().length === 0;
    if (status === "published" && contentIsBlank) {
      return toast.error("Add some content before publishing this post.");
    }
    try {
      const id = await upsert.mutateAsync({
        ...form,
        content,
        status,
        reading_time: readingTime(content),
        excerpt: form.excerpt || null as never,
      });
      toast.success(status === "published" ? "Post published" : "Draft saved");
      if (isNew) navigate({ to: "/admin/posts/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!isNew && isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isNew && !existing) {
    return <p className="py-20 text-center text-muted-foreground">Post not found.</p>;
  }

  const metaTitleLen = (form.meta_title || form.title).length;
  const metaDescLen = (form.meta_description || form.excerpt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isNew ? "New post" : "Edit post"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save("draft")} disabled={upsert.isPending}>
            {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          <Button onClick={() => save("published")} disabled={upsert.isPending}>
            <Eye className="mr-2 h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Main content */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="A compelling headline" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={form.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
              <p className="text-xs text-muted-foreground">/blog/{form.slug || "your-post-slug"}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="excerpt">Excerpt / summary (used in cards, AEO answer box)</Label>
              <Textarea id="excerpt" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </div>

            {/* For existing posts, wait until the form is hydrated (form.id set)
                before mounting the editor — otherwise it captures the empty
                initial content and never picks up the loaded HTML. */}
            {(isNew || form.id) && (
              <ContentEditorCard
                key={form.id ?? "new"}
                initialContent={form.content}
                onChange={onContentChange}
              />
            )}
          </div>

          {/* SEO */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">SEO &amp; social</h2>
            <div className="space-y-1.5">
              <Label htmlFor="meta_title">Meta title <span className={cn("text-xs", metaTitleLen > 60 && "text-destructive")}>({metaTitleLen}/60)</span></Label>
              <Input id="meta_title" value={form.meta_title ?? ""} onChange={(e) => set("meta_title", e.target.value || null)} placeholder={form.title} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta_description">Meta description <span className={cn("text-xs", metaDescLen > 160 && "text-destructive")}>({metaDescLen}/160)</span></Label>
              <Textarea id="meta_description" rows={2} value={form.meta_description ?? ""} onChange={(e) => set("meta_description", e.target.value || null)} placeholder={form.excerpt} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="focus_keyword">Focus keyword</Label>
                <Input id="focus_keyword" value={form.focus_keyword ?? ""} onChange={(e) => set("focus_keyword", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input id="canonical_url" value={form.canonical_url ?? ""} onChange={(e) => set("canonical_url", e.target.value || null)} placeholder="Optional" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="og_title">OG title</Label>
                <Input id="og_title" value={form.og_title ?? ""} onChange={(e) => set("og_title", e.target.value || null)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="og_description">OG description</Label>
                <Input id="og_description" value={form.og_description ?? ""} onChange={(e) => set("og_description", e.target.value || null)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>OG image</Label>
              <div className="flex items-center gap-3">
                {form.og_image ? (
                  <img src={form.og_image} alt="OG preview" className="h-16 w-28 rounded border object-cover" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded border bg-muted"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0], "og_image")} />
                  <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"><Upload className="mr-2 h-4 w-4" /> Upload</span>
                </label>
                {form.og_image && <Button variant="ghost" size="sm" onClick={() => set("og_image", null)}>Remove</Button>}
              </div>
            </div>
          </div>

          {/* FAQ builder */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">FAQ (AEO / FAQ schema)</h2>
              <Button size="sm" variant="outline" onClick={() => set("faq_json", [...form.faq_json, { question: "", answer: "" }])}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {form.faq_json.length === 0 && <p className="text-sm text-muted-foreground">No FAQs. These generate FAQPage structured data.</p>}
            {form.faq_json.map((faq: FaqItem, i: number) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={faq.question}
                    placeholder="Question"
                    onChange={(e) => {
                      const next = [...form.faq_json];
                      next[i] = { ...next[i], question: e.target.value };
                      set("faq_json", next);
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => set("faq_json", form.faq_json.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  value={faq.answer}
                  placeholder="Answer"
                  rows={2}
                  onChange={(e) => {
                    const next = [...form.faq_json];
                    next[i] = { ...next[i], answer: e.target.value };
                    set("faq_json", next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Publish</h2>
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Featured</Label>
              <Switch id="featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="trending">Trending</Label>
              <Switch id="trending" checked={form.trending} onCheckedChange={(v) => set("trending", v)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="published_at">Schedule / publish date</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => set("published_at", new Date().toISOString())}
                  >
                    Now
                  </Button>
                  {form.published_at && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => set("published_at", null)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <Input
                id="published_at"
                type="datetime-local"
                value={isoToLocalInput(form.published_at)}
                onChange={(e) => set("published_at", localInputToIso(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Shown in your local time. Tap <span className="font-medium">Now</span> to use the current date &amp; time, or leave blank to publish now.
              </p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Organize</h2>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id ?? "none"} onValueChange={(v) => set("category_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Author</Label>
              <Select value={form.author_id ?? "none"} onValueChange={(v) => set("author_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {form.tagIds.map((id) => {
                  const t = allTags.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {t.name}
                      <button onClick={() => set("tagIds", form.tagIds.filter((x) => x !== id))}><X className="h-3 w-3" /></button>
                    </Badge>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTagByName(newTag); } }}
                  placeholder="Add existing tag…"
                  list="tag-options"
                />
                <datalist id="tag-options">
                  {allTags.map((t) => <option key={t.id} value={t.name} />)}
                </datalist>
                <Button variant="outline" onClick={() => addTagByName(newTag)}>Add</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Featured image</h2>
            {form.featured_image ? (
              <img src={form.featured_image} alt={form.image_alt || ""} className="max-h-[360px] w-full rounded-lg border bg-muted object-contain" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0], "featured_image")} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload
              </Button>
              {form.featured_image && <Button variant="ghost" onClick={() => set("featured_image", null)}>Remove</Button>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="image_alt">Image alt text (accessibility &amp; SEO)</Label>
              <Input id="image_alt" value={form.image_alt ?? ""} onChange={(e) => set("image_alt", e.target.value || null)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
