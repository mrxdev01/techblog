// Central Supabase connection config.
// The anon (publishable) key + project URL are SAFE to ship in frontend code —
// Row Level Security protects your data. Env vars (e.g. VITE_SUPABASE_* on
// Vercel) still take priority and override these fallbacks when present.
const FALLBACK_SUPABASE_URL = "https://uogzrsjwrisdgddotxey.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ3pyc2p3cmlzZGdkZG90eGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNDI5NzksImV4cCI6MjA5ODcxODk3OX0.Wu9OXaCulil5nPL7z6EOJ7kHtmR7nIWLaZbU4svKlsI";

export const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_SUPABASE_ANON_KEY;
