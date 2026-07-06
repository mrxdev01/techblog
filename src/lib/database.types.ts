/**
 * Hand-maintained types describing YOUR Supabase schema (see supabase/schema.sql).
 * Kept intentionally lightweight. If you later use the Supabase CLI you can
 * regenerate a fuller version, but this is enough for a fully typed app.
 */

export type PostStatus = "draft" | "published";
export type AppRole = "admin" | "user";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
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
  faq_json: FaqItem[] | null;
  reading_time: number | null;
  views_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface AuthorRow {
  id: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  social_links: Record<string, string> | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}



/** A post joined with its category, author and tags for display. */
export interface PostWithRelations extends PostRow {
  category: CategoryRow | null;
  author: AuthorRow | null;
  tags: TagRow[];
}

/** Minimal Supabase Database generic so the client is typed. */
export interface Database {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: Partial<PostRow> & { title: string; slug: string };
        Update: Partial<PostRow>;
      };
      categories: {
        Row: CategoryRow;
        Insert: Partial<CategoryRow> & { name: string; slug: string };
        Update: Partial<CategoryRow>;
      };
      tags: {
        Row: TagRow;
        Insert: Partial<TagRow> & { name: string; slug: string };
        Update: Partial<TagRow>;
      };
      post_tags: {
        Row: { post_id: string; tag_id: string };
        Insert: { post_id: string; tag_id: string };
        Update: { post_id?: string; tag_id?: string };
      };
      authors: {
        Row: AuthorRow;
        Insert: Partial<AuthorRow> & { name: string };
        Update: Partial<AuthorRow>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { user_id: string };
        Update: Partial<ProfileRow>;
      };

    };
    Views: Record<string, never>;
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: AppRole };
        Returns: boolean;
      };
      increment_post_views: {
        Args: { _slug: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      post_status: PostStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
