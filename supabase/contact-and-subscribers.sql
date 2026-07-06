-- ============================================================================
--  CONTACT MESSAGES + NEWSLETTER SUBSCRIBERS
--  Run this in YOUR Supabase project:
--    Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
--  Safe to re-run. Requires schema.sql to have been run first (needs has_role()).
--
--  Security model:
--   - ANYONE (a website visitor) can SUBMIT a contact message / subscribe.
--   - ONLY an admin (you) can READ or DELETE the collected data.
--   - The data is private: normal visitors can never list other people's
--     emails or messages (RLS blocks SELECT for non-admins).
-- ============================================================================

-- ---------- contact_messages ----------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

-- ---------- subscribers ----------
create table if not exists public.subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
--  GRANTS (PostgREST needs explicit grants; RLS still restricts what happens)
-- ============================================================================
-- Visitors may only INSERT (submit). They may NOT read the tables.
grant insert on public.contact_messages to anon, authenticated;
grant insert on public.subscribers      to anon, authenticated;

-- Signed-in users get select/delete rights, but RLS below limits it to admins.
grant select, delete on public.contact_messages to authenticated;
grant select, delete on public.subscribers      to authenticated;

grant all on public.contact_messages to service_role;
grant all on public.subscribers      to service_role;

-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================
alter table public.contact_messages enable row level security;
alter table public.subscribers      enable row level security;

-- ---- contact_messages ----
drop policy if exists "contact insert public" on public.contact_messages;
create policy "contact insert public" on public.contact_messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists "contact admin read" on public.contact_messages;
create policy "contact admin read" on public.contact_messages
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "contact admin delete" on public.contact_messages;
create policy "contact admin delete" on public.contact_messages
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ---- subscribers ----
drop policy if exists "subscribers insert public" on public.subscribers;
create policy "subscribers insert public" on public.subscribers
  for insert to anon, authenticated
  with check (true);

drop policy if exists "subscribers admin read" on public.subscribers;
create policy "subscribers admin read" on public.subscribers
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "subscribers admin delete" on public.subscribers;
create policy "subscribers admin delete" on public.subscribers
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
