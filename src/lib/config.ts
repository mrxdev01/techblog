/**
 * Central, browser-safe site + integration configuration.
 * All values come from VITE_* env vars (see .env.example). Reading
 * import.meta.env at module scope is safe here — these are public values.
 */

export const SITE = {
  name: import.meta.env.VITE_SITE_NAME || "Factonia",
  url: (import.meta.env.VITE_SITE_URL || "https://factonia.in").replace(/\/$/, ""),
  description:
    "Factonia — well-researched articles, facts, and clear explainers across technology, science, business, and the ideas shaping what comes next.",
  twitter: "@factonia",
} as const;

/**
 * Public social / profile URLs used for Organization `sameAs` (helps Google
 * and AI engines build an entity/knowledge-graph link to your brand).
 * Set VITE_SOCIAL_LINKS to a comma-separated list of full https URLs, e.g.
 *   VITE_SOCIAL_LINKS=https://x.com/factonia,https://www.linkedin.com/company/factonia
 * Left empty by default so no placeholder/fake profiles are ever emitted.
 */
export const SOCIAL_LINKS: string[] = (import.meta.env.VITE_SOCIAL_LINKS || "")
  .split(",")
  .map((s: string) => s.trim())
  .filter((s: string) => s.startsWith("http"));

export const ANALYTICS = {
  gaMeasurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || "",
  clarityProjectId: import.meta.env.VITE_CLARITY_PROJECT_ID || "",
  gscVerification: import.meta.env.VITE_GSC_VERIFICATION || "",
} as const;

export const ADSENSE = {
  publisherId: import.meta.env.VITE_ADSENSE_PUBLISHER_ID || "",
  get enabled() {
    return this.publisherId.startsWith("ca-pub-") && !this.publisherId.includes("XXXX");
  },
} as const;

/** Absolute URL helper for canonical tags, og:url, sitemap, etc. */
export function absoluteUrl(path = "/"): string {
  const base = SITE.url || "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
