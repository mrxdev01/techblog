-- ============================================================================
--  NEBULA BLOG — DATABASE SCHEMA
--  Run this in YOUR Supabase project:
--    Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--  Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- ============================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

-- ============================================================================
--  TABLES
-- ============================================================================

-- ---------- profiles (role storage — roles live OUTSIDE the posts data) ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

-- ---------- authors ----------
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text,
  avatar text,
  social_links jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- tags ----------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- posts ----------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  featured_image text,
  image_alt text,
  category_id uuid references public.categories(id) on delete set null,
  author_id uuid references public.authors(id) on delete set null,
  status public.post_status not null default 'draft',
  featured boolean not null default false,
  trending boolean not null default false,
  meta_title text,
  meta_description text,
  focus_keyword text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  faq_json jsonb default '[]'::jsonb,
  reading_time integer default 1,
  views_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- ---------- post_tags (many-to-many) ----------
create table if not exists public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id  uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

-- ============================================================================
--  INDEXES
-- ============================================================================
create index if not exists idx_posts_slug on public.posts (slug);
create index if not exists idx_posts_status on public.posts (status);
create index if not exists idx_posts_category on public.posts (category_id);
create index if not exists idx_posts_published_at on public.posts (published_at desc);
create index if not exists idx_posts_featured on public.posts (featured) where featured = true;
create index if not exists idx_posts_trending on public.posts (trending) where trending = true;
create index if not exists idx_posts_title_trgm on public.posts using gin (to_tsvector('english', title));
create index if not exists idx_categories_slug on public.categories (slug);
create index if not exists idx_tags_slug on public.tags (slug);
create index if not exists idx_post_tags_tag on public.post_tags (tag_id);

-- ============================================================================
--  FUNCTIONS
-- ============================================================================

-- Role check (SECURITY DEFINER avoids recursive RLS on profiles)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = _user_id and role = _role
  );
$$;

-- Public, safe view-counter (increments only published posts)
create or replace function public.increment_post_views(_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set views_count = views_count + 1
  where slug = _slug and status = 'published';
$$;

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Auto-create a profile (role = 'user') on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  GRANTS (PostgREST needs explicit grants; RLS still restricts rows)
-- ============================================================================
grant usage on schema public to anon, authenticated;

grant select on public.posts, public.categories, public.tags, public.post_tags, public.authors to anon, authenticated;
grant insert, update, delete on public.posts, public.categories, public.tags, public.post_tags, public.authors to authenticated;
grant select on public.profiles to authenticated;

grant all on public.posts, public.categories, public.tags, public.post_tags, public.authors, public.profiles to service_role;

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.posts       enable row level security;
alter table public.categories  enable row level security;
alter table public.tags        enable row level security;
alter table public.post_tags   enable row level security;
alter table public.authors     enable row level security;
alter table public.profiles    enable row level security;

-- ---- posts ----
drop policy if exists "posts public read published" on public.posts;
create policy "posts public read published" on public.posts
  for select to anon, authenticated
  using (status = 'published' or public.has_role(auth.uid(), 'admin'));

drop policy if exists "posts admin insert" on public.posts;
create policy "posts admin insert" on public.posts
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "posts admin update" on public.posts;
create policy "posts admin update" on public.posts
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "posts admin delete" on public.posts;
create policy "posts admin delete" on public.posts
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---- categories / tags / authors: public read, admin write ----
do $$
declare t text;
begin
  foreach t in array array['categories','tags','authors']
  loop
    execute format('drop policy if exists "%1$s public read" on public.%1$s;', t);
    execute format('create policy "%1$s public read" on public.%1$s for select to anon, authenticated using (true);', t);
    execute format('drop policy if exists "%1$s admin write" on public.%1$s;', t);
    execute format('create policy "%1$s admin write" on public.%1$s for all to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''));', t);
  end loop;
end $$;

-- ---- post_tags: public read, admin write ----
drop policy if exists "post_tags public read" on public.post_tags;
create policy "post_tags public read" on public.post_tags
  for select to anon, authenticated using (true);

drop policy if exists "post_tags admin write" on public.post_tags;
create policy "post_tags admin write" on public.post_tags
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ---- profiles: a user reads only their own row ----
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

-- ============================================================================
--  STORAGE (public bucket for post/featured images)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

drop policy if exists "blog-images public read" on storage.objects;
create policy "blog-images public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'blog-images');

drop policy if exists "blog-images admin write" on storage.objects;
create policy "blog-images admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "blog-images admin update" on storage.objects;
create policy "blog-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "blog-images admin delete" on storage.objects;
create policy "blog-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'));

-- ============================================================================
--  MAKE YOURSELF AN ADMIN
--  1) Create your account first (sign up in the app, OR Supabase Dashboard ->
--     Authentication -> Users -> Add user).
--  2) Then run ONE of the following, replacing the email:
-- ----------------------------------------------------------------------------
-- update public.profiles
--   set role = 'admin'
--   where user_id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================

-- ---------- Optional starter content ----------
insert into public.authors (name, bio)
values ('Factonia Team', 'The Factonia Team')
on conflict do nothing;

insert into public.categories (name, slug, description) values
  ('Technology', 'technology', 'Deep dives into modern technology.'),
  ('Product',    'product',    'Product thinking and design.'),
  ('Culture',    'culture',    'Ideas shaping how we live and work.')
on conflict (slug) do nothing;
