import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/blog-utils";
import { compressImage } from "@/lib/media-compress";
import { invalidateBlog } from "@/lib/queries";
import { collectImagePaths, removeBlogImages } from "@/lib/storage-cleanup";
import type {
  AuthorRow,
  CategoryRow,
  FaqItem,
  PostStatus,
  PostWithRelations,
  TagRow,
} from "@/lib/database.types";

const POST_SELECT = "*, category:categories(*), author:authors(*), post_tags(tag:tags(*))";

// Lightweight projection for the admin posts table — excludes the heavy
// `content` HTML so the dashboard list loads fast even with hundreds of posts.
const ADMIN_LIST_SELECT =
  "id, title, slug, status, featured, trending, views_count, created_at, published_at, category:categories(id,name)";

interface RawPost extends Omit<PostWithRelations, "tags"> {
  post_tags?: { tag: TagRow | null }[];
}
function normalize(row: RawPost): PostWithRelations {
  const { post_tags, ...rest } = row;
  return {
    ...(rest as PostWithRelations),
    tags: (post_tags ?? []).map((pt) => pt.tag).filter((t): t is TagRow => Boolean(t)),
  };
}

/** Strip HTML/whitespace to detect genuinely empty rich-text content. */
function isBlankHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;|\s+/g, "").trim().length === 0;
}

/**
 * Return a slug guaranteed unique across `posts`, appending -2, -3, … on
 * collision. Excludes the post being edited so re-saving keeps its slug.
 * Prevents duplicate-slug DB errors and broken /blog/:slug routes.
 */
export async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  const base = slugify(desired) || `post-${Date.now().toString(36)}`;
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    let query = supabase.from("posts").select("id").eq("slug", candidate).limit(1);
    if (excludeId) query = query.neq("id", excludeId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
  // Extremely unlikely fallback — guarantee uniqueness with a random suffix.
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

/** All posts (any status) for the admin table. */
export const adminPostsQuery = () =>
  queryOptions({
    queryKey: ["admin-posts"],
    queryFn: async (): Promise<PostWithRelations[]> => {
      const { data, error } = await supabase
        .from("posts")
        .select(ADMIN_LIST_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as RawPost[]).map(normalize);
    },
  });

/** Single post by id for the editor. */
export const adminPostByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin-post", id],
    queryFn: async (): Promise<PostWithRelations | null> => {
      const { data, error } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? normalize(data as RawPost) : null;
    },
    enabled: id !== "new",
  });

/** Dashboard counters. */
export const adminStatsQuery = () =>
  queryOptions({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [posts, published, drafts, cats, tags, views] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("tags").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("views_count"),
      ]);
      const viewRows = (views.data ?? []) as { views_count: number | null }[];
      const totalViews = viewRows.reduce((s, r) => s + (r.views_count ?? 0), 0);

      return {
        posts: posts.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        categories: cats.count ?? 0,
        tags: tags.count ?? 0,
        views: totalViews,
      };
    },
  });

export interface PostFormValues {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string | null;
  image_alt: string | null;
  category_id: string | null;
  author_id: string | null;
  status: PostStatus;
  featured: boolean;
  trending: boolean;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  faq_json: FaqItem[];
  reading_time: number;
  published_at: string | null;
  tagIds: string[];
}

/** Create or update a post and sync its tags. */
export function useUpsertPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: PostFormValues) => {
      const { id, tagIds, ...fields } = values;

      // --- Server-safe validation (defends both the editor and AI Writer) ---
      if (!fields.title?.trim()) throw new Error("Title is required.");
      if (fields.status === "published" && isBlankHtml(fields.content)) {
        throw new Error("Add some content before publishing this post.");
      }

      // Always normalise + de-duplicate the slug so /blog/:slug never collides.
      const uniqueSlug = await ensureUniqueSlug(fields.slug || fields.title, id);

      const payload = {
        ...fields,
        slug: uniqueSlug,
        published_at:
          fields.status === "published" ? fields.published_at || new Date().toISOString() : fields.published_at,
        updated_at: new Date().toISOString(),
      };

      let postId = id;
      if (id) {
        // Fetch the current version so we can clean up images no longer referenced.
        const { data: prev } = await supabase
          .from("posts")
          .select("content, featured_image, og_image")
          .eq("id", id)
          .maybeSingle();

        const { error } = await supabase.from("posts").update(payload as never).eq("id", id);
        if (error) throw error;

        if (prev) {
          const p = prev as { content: string | null; featured_image: string | null; og_image: string | null };
          const oldPaths = collectImagePaths([p.content, p.featured_image, p.og_image]);
          const newPaths = collectImagePaths([fields.content, fields.featured_image, fields.og_image]);
          const orphaned = oldPaths.filter((path) => !newPaths.includes(path));
          await removeBlogImages(orphaned);
        }
      } else {
        const { data, error } = await supabase.from("posts").insert(payload as never).select("id").single();
        if (error) throw error;
        postId = (data as { id: string }).id;
      }

      // Sync post_tags
      await supabase.from("post_tags").delete().eq("post_id", postId!);
      if (tagIds.length) {
        const rows = tagIds.map((tag_id) => ({ post_id: postId!, tag_id }));
        const { error } = await supabase.from("post_tags").insert(rows as never);
        if (error) throw error;
      }

      return postId!;
    },
    onSuccess: () => {
      invalidateBlog(qc);
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
    },
  });
}

export function useTogglePostFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("posts").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateBlog(qc);
      qc.invalidateQueries({ queryKey: ["admin-posts"] });
    },
  });
}

/** Upload an image to the public blog-images bucket, returns its public URL. */
export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Image must be smaller than 15 MB.");

  // Compress in the browser first (keeps quality, cuts size → faster pages).
  const optimized = await compressImage(file);

  const ext = optimized.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("blog-images").upload(path, optimized, {
    cacheControl: "31536000",
    upsert: false,
    contentType: optimized.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
  return data.publicUrl;
}

/** ---- Taxonomy mutations ---- */
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; slug: string; description?: string }) => {
      const { error } = await supabase.from("categories").insert(v as never);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; slug: string }) => {
      const { error } = await supabase.from("tags").insert(v as never);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useCreateAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { name: string; bio?: string; avatar?: string }) => {
      const { error } = await supabase.from("authors").insert(v as never);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useUpdateAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; bio?: string | null; avatar?: string | null }) => {
      const { error } = await supabase.from("authors").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
export function useDeleteAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("authors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateBlog(qc),
  });
}

/** Find a category by name (case-insensitive) or create it; returns its id. */
export async function ensureCategory(name: string): Promise<string | null> {
  const clean = name.trim();
  if (!clean) return null;
  const slug = slugify(clean);
  const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: clean, slug } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Find or create each tag by name; returns the resolved tag ids. */
export async function ensureTags(names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of names) {
    const clean = raw.trim();
    if (!clean) continue;
    const slug = slugify(clean);
    const { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
    if (existing) {
      ids.push((existing as { id: string }).id);
      continue;
    }
    const { data } = await supabase.from("tags").insert({ name: clean, slug } as never).select("id").single();
    if (data) ids.push((data as { id: string }).id);
  }
  return ids;
}

export type { CategoryRow, TagRow, AuthorRow };
