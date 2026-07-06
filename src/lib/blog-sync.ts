import type { QueryClient } from "@tanstack/react-query";

/**
 * Instant cross-tab content sync.
 *
 * The admin panel and the public site usually run in *different* browser
 * tabs/windows, each with its own React Query cache. Invalidating the cache
 * inside the admin tab does nothing for the public tab, so a freshly
 * published/edited/deleted post would only appear after a hard refresh.
 *
 * This module bridges tabs with two mechanisms that work *without any
 * server configuration*:
 *   1. BroadcastChannel — instant same-origin messaging between tabs.
 *   2. localStorage `storage` event — fallback for older browsers.
 *
 * On top of this, Supabase Realtime (see `useRealtimeBlog`) covers updates
 * made from *other devices*. Together they guarantee content reflects on the
 * UI within milliseconds.
 */

const CHANNEL_NAME = "factonia-blog-sync";
const STORAGE_PING = "factonia-blog-ping";

/** Every blog-related query key used across public + admin surfaces. */
const BLOG_QUERY_KEYS = [
  "posts",
  "posts-page",
  "post",
  "categories",
  "tags",
  "authors",
  "admin-posts",
  "admin-post",
  "admin-stats",
] as const;

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/**
 * Aggressively refetch every blog query in this tab. `refetchType: "all"`
 * refreshes even inactive/background queries so, when the user switches to a
 * tab, its data is already up to date (no flicker, no manual refresh).
 */
export function refetchAllBlog(qc: QueryClient): void {
  for (const key of BLOG_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [key], refetchType: "all" });
  }
}

/** Notify every other open tab (admin + public) that blog data changed. */
export function broadcastBlogChange(): void {
  if (typeof window === "undefined") return;
  const payload = { at: Date.now() };
  try {
    getChannel()?.postMessage(payload);
  } catch {
    /* channel may be closed — ignore */
  }
  try {
    // Writing a changing value fires the `storage` event in other tabs.
    localStorage.setItem(STORAGE_PING, String(payload.at));
  } catch {
    /* storage may be unavailable — ignore */
  }
}

/**
 * Subscribe the current tab to cross-tab blog-change pings and refetch on
 * arrival. Returns an unsubscribe function for effect cleanup.
 */
export function subscribeBlogSync(qc: QueryClient): () => void {
  if (typeof window === "undefined") return () => {};

  const onMessage = () => refetchAllBlog(qc);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_PING) refetchAllBlog(qc);
  };

  const ch = getChannel();
  ch?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
  };
}
