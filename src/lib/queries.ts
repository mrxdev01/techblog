import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { broadcastBlogChange, refetchAllBlog, subscribeBlogSync } from "@/lib/blog-sync";
import { collectImagePaths, removeBlogImages } from "@/lib/storage-cleanup";
import type {
  AuthorRow,
  CategoryRow,
  PostWithRelations,
  TagRow,
} from "@/lib/database.types";

// Full row (incl. heavy `content` HTML + faq_json) — only for the detail page.
const POST_SELECT =
  "*, category:categories(*), author:authors(*), post_tags(tag:tags(*))";

// Lightweight projection for listings/cards. Excludes the large `content`
// column, `faq_json`, and SEO/OG fields none of the cards render — this cuts
// the payload of every listing (home, blog, category, tag, search, related,
// trending) by an order of magnitude and speeds up the queries themselves.
const LIST_SELECT =
  "id, title, slug, excerpt, featured_image, image_alt, reading_time, trending, featured, status, views_count, published_at, created_at, category:categories(id,name,slug), author:authors(id,name,avatar)";

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

export interface PostFilter {
  status?: "published" | "draft" | "all";
  categorySlug?: string;
  tagSlug?: string;
  authorId?: string;
  featured?: boolean;
  trending?: boolean;
  search?: string;
  order?: "recent" | "popular";
  limit?: number;
  excludeId?: string;
  /** 1-based page number for paginated listings. */
  page?: number;
  /** Page size for paginated listings. */
  pageSize?: number;
}

export interface PostPage {
  rows: PostWithRelations[];
  total: number;
}

const EMPTY_PAGE: PostPage = { rows: [], total: 0 };

/**
 * Escape a free-text search term so it can be safely embedded inside a
 * PostgREST `.or(...)` filter list. Reserved characters (`,` `(` `)` `"`)
 * would otherwise break the filter grammar. Wrapping the value in double
 * quotes makes PostgREST treat it literally; we strip embedded quotes and
 * backslashes as defense-in-depth.
 */
function escapeSearchTerm(term: string): string {
  return term.replace(/[\\"]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Retry a data fetch a few times with a short backoff. This is the core of
 * the "first load fails, refresh fixes it" bug: the very first request to an
 * external Supabase project after a cold start can be slow or flake, which
 * previously turned into an empty list or a false "not found" (404) page.
 * Retrying within the same request does automatically what the manual refresh
 * did — so users never see the transient failure.
 */
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < tries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

/** Resolve a category slug to its id (cached-free tiny lookup). */
async function categoryIdFromSlug(slug: string): Promise<string | null> {
  const data = await withRetry(async () => {
    const res = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  });
  return (data as { id: string } | null)?.id ?? null;
}

/** Resolve a tag slug to the set of post ids carrying that tag. */
async function postIdsForTag(slug: string): Promise<string[] | null> {
  const tag = await withRetry(async () => {
    const res = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
    if (res.error) throw res.error;
    return res.data;
  });
  const tagId = (tag as { id: string } | null)?.id;
  if (!tagId) return null;

  const data = await withRetry(async () => {
    const res = await supabase.from("post_tags").select("post_id").eq("tag_id", tagId);
    if (res.error) throw res.error;
    return res.data;
  });
  return ((data as { post_id: string }[] | null) ?? []).map((r) => r.post_id);
}

/**
 * Core query builder shared by list and paginated fetches. All filtering
 * (status, taxonomy, author, search) is applied server-side so `limit`,
 * `range`, and `count` operate on the correct result set.
 *
 * Any failure resolves to an EMPTY page (logged) instead of throwing, so a
 * transient/network error never crashes the page with a full-screen error —
 * the listing simply renders its empty state. Content shows when available.
 */
async function runPostsQuery(
  filter: PostFilter,
  opts: { withCount: boolean },
): Promise<PostPage> {
  if (!isSupabaseConfigured) return EMPTY_PAGE;

  try {
    // Resolve taxonomy slugs to ids up-front (server-side filtering).
    let categoryId: string | null | undefined;
    if (filter.categorySlug) {
      categoryId = await categoryIdFromSlug(filter.categorySlug);
      if (!categoryId) return EMPTY_PAGE;
    }

    let tagPostIds: string[] | null | undefined;
    if (filter.tagSlug) {
      tagPostIds = await postIdsForTag(filter.tagSlug);
      if (!tagPostIds || tagPostIds.length === 0) return EMPTY_PAGE;
    }

    let query = supabase
      .from("posts")
      .select(LIST_SELECT, opts.withCount ? { count: "exact" } : undefined);

    if (!filter.status || filter.status === "published") {
      query = query.eq("status", "published");
    } else if (filter.status === "draft") {
      query = query.eq("status", "draft");
    }

    if (filter.featured) query = query.eq("featured", true);
    if (filter.trending) query = query.eq("trending", true);
    if (filter.authorId) query = query.eq("author_id", filter.authorId);
    if (filter.excludeId) query = query.neq("id", filter.excludeId);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (tagPostIds) query = query.in("id", tagPostIds);

    if (filter.search) {
      const safe = escapeSearchTerm(filter.search);
      if (safe) query = query.or(`title.ilike."%${safe}%",excerpt.ilike."%${safe}%"`);
    }

    if (filter.order === "popular") {
      query = query.order("views_count", { ascending: false });
    } else {
      query = query
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    }

    // Pagination takes precedence over a raw limit.
    if (filter.page && filter.pageSize) {
      const from = (filter.page - 1) * filter.pageSize;
      query = query.range(from, from + filter.pageSize - 1);
    } else if (filter.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error, count } = await withRetry(async () => {
      const res = await query;
      if (res.error) throw res.error;
      return res;
    });
    if (error) throw error;

    return {
      rows: (data as RawPost[]).map(normalize),
      total: count ?? (data as RawPost[]).length,
    };
  } catch (err) {
    console.warn("[queries] posts fetch failed, showing empty list:", err);
    return EMPTY_PAGE;
  }
}

async function fetchPosts(filter: PostFilter = {}): Promise<PostWithRelations[]> {
  const { rows } = await runPostsQuery(filter, { withCount: false });
  return rows;
}

async function fetchPostsPage(filter: PostFilter = {}): Promise<PostPage> {
  return runPostsQuery(filter, { withCount: true });
}

/** Simple list query (small, limited result sets — home, related, trending). */
export const postsQuery = (filter: PostFilter = {}) =>
  queryOptions({
    queryKey: ["posts", filter],
    queryFn: () => fetchPosts(filter),
  });

/** Paginated query returning `{ rows, total }` for listing pages. */
export const postsPageQuery = (filter: PostFilter = {}) =>
  queryOptions({
    queryKey: ["posts-page", filter],
    queryFn: () => fetchPostsPage(filter),
  });

export const postBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["post", slug],
    queryFn: async (): Promise<PostWithRelations | null> => {
      if (!isSupabaseConfigured) return null;
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("posts").select(POST_SELECT).eq("slug", slug).maybeSingle();
          if (res.error) throw res.error;
          return res.data;
        });
        return data ? normalize(data as RawPost) : null;
      } catch (err) {
        console.warn("[queries] post fetch failed:", err);
        return null;
      }
    },
  });

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      if (!isSupabaseConfigured) return [];
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("categories").select("*").order("name");
          if (res.error) throw res.error;
          return res.data;
        });
        return data ?? [];
      } catch (err) {
        console.warn("[queries] categories fetch failed:", err);
        return [];
      }
    },
  });

export const categoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: async (): Promise<CategoryRow | null> => {
      if (!isSupabaseConfigured) return null;
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
          if (res.error) throw res.error;
          return res.data;
        });
        return data ?? null;
      } catch (err) {
        console.warn("[queries] category fetch failed:", err);
        return null;
      }
    },
  });

export const tagsQuery = () =>
  queryOptions({
    queryKey: ["tags"],
    queryFn: async (): Promise<TagRow[]> => {
      if (!isSupabaseConfigured) return [];
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("tags").select("*").order("name");
          if (res.error) throw res.error;
          return res.data;
        });
        return data ?? [];
      } catch (err) {
        console.warn("[queries] tags fetch failed:", err);
        return [];
      }
    },
  });

export const tagBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tag", slug],
    queryFn: async (): Promise<TagRow | null> => {
      if (!isSupabaseConfigured) return null;
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("tags").select("*").eq("slug", slug).maybeSingle();
          if (res.error) throw res.error;
          return res.data;
        });
        return data ?? null;
      } catch (err) {
        console.warn("[queries] tag fetch failed:", err);
        return null;
      }
    },
  });

export const authorsQuery = () =>
  queryOptions({
    queryKey: ["authors"],
    queryFn: async (): Promise<AuthorRow[]> => {
      if (!isSupabaseConfigured) return [];
      try {
        const data = await withRetry(async () => {
          const res = await supabase.from("authors").select("*").order("name");
          if (res.error) throw res.error;
          return res.data;
        });
        return data ?? [];
      } catch (err) {
        console.warn("[queries] authors fetch failed:", err);
        return [];
      }
    },
  });

/**
 * Keep every open tab (this device) and every other device in sync.
 *
 * - Supabase Realtime → updates made on *other devices* (requires the
 *   realtime publication to include these tables — see supabase/realtime.sql).
 * - BroadcastChannel / storage ping → instant updates between *tabs of this
 *   browser*, and works even if Realtime is not enabled.
 */
export function useRealtimeBlog() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) Cross-tab sync (no server config required).
    const unsubscribe = subscribeBlogSync(qc);

    // 2) Cross-device sync via Supabase Realtime.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured) {
      const onChange = () => refetchAllBlog(qc);
      channel = supabase
        .channel("blog-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "post_tags" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, onChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "authors" }, onChange)
        .subscribe();
    }

    return () => {
      unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}

/**
 * Invalidate + refetch all blog caches in this tab AND broadcast the change
 * to every other open tab so admin edits reflect on the public site instantly.
 */
export function invalidateBlog(qc: QueryClient) {
  refetchAllBlog(qc);
  broadcastBlogChange();
}

/** Fire-and-forget public view counter. Never throws — a failed count is harmless. */
export function incrementViews(slug: string) {
  if (!isSupabaseConfigured) return;
  void Promise.resolve(supabase.rpc("increment_post_views", { _slug: slug } as never)).catch(
    (err) => console.warn("[queries] view count failed:", err),
  );
}

/** ---- Admin mutation hooks ---- */
export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Fetch the post's images first so we can remove them from storage.
      const { data: post } = await supabase
        .from("posts")
        .select("content, featured_image, og_image")
        .eq("id", id)
        .maybeSingle();

      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;

      if (post) {
        const p = post as { content: string | null; featured_image: string | null; og_image: string | null };
        await removeBlogImages(collectImagePaths([p.content, p.featured_image, p.og_image]));
      }
    },
    onSuccess: () => invalidateBlog(qc),
  });
}
