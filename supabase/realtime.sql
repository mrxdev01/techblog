-- ============================================================================
-- Factonia — Enable Supabase Realtime for instant content updates
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query
-- → paste → Run). This lets the public site update on OTHER DEVICES the moment
-- you publish/edit/delete a post in the admin panel.
--
-- Note: updates between tabs of the SAME browser already work instantly
-- without this (via BroadcastChannel). This SQL is for cross-device sync.
-- ============================================================================

-- Add each blog table to the realtime publication (safe to re-run).
DO $$
BEGIN
  -- posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  END IF;

  -- post_tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'post_tags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_tags;
  END IF;

  -- categories
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;

  -- tags
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
  END IF;

  -- authors
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'authors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.authors;
  END IF;
END $$;

-- Verify which tables are now realtime-enabled:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
