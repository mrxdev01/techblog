/**
 * Auto-recovery for transient client-side load failures.
 *
 * The #1 cause of the intermittent "This page didn't load" screen on
 * mobile/tablet is a STALE CHUNK: the user has an old page open (or cached),
 * the site gets republished, and the next navigation tries to download a JS
 * chunk that no longer exists → dynamic import fails → root error boundary.
 * A flaky mobile connection dropping a chunk download mid-way produces the
 * exact same error.
 *
 * In both cases a full page reload fixes it instantly (fresh HTML → fresh
 * chunk URLs). So instead of showing the error screen, we reload the page
 * automatically — at most once per short window to avoid reload loops.
 */

const RELOAD_FLAG = "factonia:auto-reload-at";
const RELOAD_WINDOW_MS = 30_000;

/** Does this error look like a failed JS/CSS chunk or module download? */
export function isRecoverableLoadError(error: unknown): boolean {
  const message =
    (error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "")).toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("chunkloaderror") ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk") ||
    message.includes("failed to load module script") ||
    // Generic network failure while fetching an asset (Safari/Chrome wording).
    message.includes("networkerror when attempting to fetch resource") ||
    (message.includes("failed to fetch") && message.includes("import"))
  );
}

/**
 * Reload the page once. Returns true if a reload was triggered, false if we
 * already reloaded recently (avoid infinite loops → show the error UI then).
 */
export function autoReloadOnce(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    // sessionStorage unavailable (private mode) — still reload, worst case
    // the browser's own bfcache prevents a hard loop.
  }
  window.location.reload();
  return true;
}

/**
 * Vite fires "vite:preloadError" when a route chunk fails to preload during
 * navigation (the stale-deploy case). Install once on the client; reloading
 * fetches the new manifest and fixes it transparently.
 */
export function installPreloadErrorRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    if (autoReloadOnce()) {
      // Prevent Vite from throwing the error up to the boundary as well.
      (event as Event & { preventDefault: () => void }).preventDefault?.();
    }
  });
}

/**
 * Silent auto-retry backoff for the "keep showing a skeleton and retry"
 * strategy used by our error boundaries. Instead of ever showing a scary
 * "This page didn't load" screen for a transient data/hydration failure, the
 * boundary renders a skeleton and re-runs the loader on this schedule. The
 * counter resets automatically after a quiet period, so a page that recovers
 * and later hits an unrelated blip starts fresh.
 */
let recoverAttempts = 0;
let lastRecoverAt = 0;
const RECOVER_QUIET_MS = 20_000;
const RECOVER_MAX_DELAY_MS = 8_000;
const RECOVER_BASE_DELAY_MS = 700;

/** Next retry delay (ms) with exponential backoff, capped. */
export function nextRecoverDelay(): number {
  const now = Date.now();
  if (now - lastRecoverAt > RECOVER_QUIET_MS) recoverAttempts = 0;
  lastRecoverAt = now;
  const delay = Math.min(RECOVER_BASE_DELAY_MS * 2 ** recoverAttempts, RECOVER_MAX_DELAY_MS);
  recoverAttempts += 1;
  return delay;
}

/** How many silent retries have happened in the current burst. */
export function recoverAttemptCount(): number {
  return recoverAttempts;
}

/** Reset the backoff (call once the page renders successfully again). */
export function resetRecoverAttempts(): void {
  recoverAttempts = 0;
}
