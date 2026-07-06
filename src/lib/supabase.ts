import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config";

const url = SUPABASE_URL;
const anonKey = SUPABASE_ANON_KEY;

/**
 * True only when real credentials have been provided in .env.
 * The UI uses this to show a friendly "connect your Supabase" state instead of
 * crashing when keys are still placeholders.
 */
export const isSupabaseConfigured =
  url.startsWith("http") && anonKey.length > 20 && !url.includes("PASTE_") && !anonKey.includes("PASTE_");

/**
 * Fetch wrapper with a hard timeout. Without this, a single hung request to
 * Supabase during server-side rendering can stall the whole page render until
 * the platform kills it — surfacing as the "This page didn't load" error on
 * first load (a refresh then works because the next request succeeds).
 * With the timeout, a stuck request aborts quickly; query helpers already
 * swallow errors and render empty/fallback states instead of crashing.
 */
const FETCH_TIMEOUT_MS = 6_000;
const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
};

/**
 * Browser Supabase client (publishable anon key). RLS enforces access control.
 * Falls back to harmless placeholder values so the app still builds/renders
 * before you paste your keys — queries simply return an error until configured.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  isSupabaseConfigured ? url : "https://placeholder.supabase.co",
  isSupabaseConfigured ? anonKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: { fetch: fetchWithTimeout },
  },
);
