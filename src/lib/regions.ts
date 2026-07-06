/**
 * English-only region (country) targeting.
 *
 * The site content is written once in English. These regions expose the SAME
 * content under country-code path prefixes (e.g. /us, /uk) purely for SEO /
 * geo-targeting, wired together with hreflang alternates. There is no
 * translation and no external API involved.
 *
 * The default (unprefixed) site at "/" is the global / x-default version.
 * Countries not listed here simply keep using "/".
 */

export interface Region {
  /** URL prefix, e.g. "us" -> /us */
  code: string;
  /** Human label for switchers, e.g. "United States" */
  label: string;
  /** hreflang value, e.g. "en-US" */
  hreflang: string;
  /** Emoji flag for the switcher */
  flag: string;
}

export const REGIONS: Region[] = [
  { code: "us", label: "United States", hreflang: "en-US", flag: "🇺🇸" },
  { code: "uk", label: "United Kingdom", hreflang: "en-GB", flag: "🇬🇧" },
  { code: "in", label: "India", hreflang: "en-IN", flag: "🇮🇳" },
  { code: "ca", label: "Canada", hreflang: "en-CA", flag: "🇨🇦" },
  { code: "au", label: "Australia", hreflang: "en-AU", flag: "🇦🇺" },
  { code: "sg", label: "Singapore", hreflang: "en-SG", flag: "🇸🇬" },
  { code: "ie", label: "Ireland", hreflang: "en-IE", flag: "🇮🇪" },
  { code: "za", label: "South Africa", hreflang: "en-ZA", flag: "🇿🇦" },
];

export const REGION_CODES = REGIONS.map((r) => r.code);

export function isValidRegion(code?: string | null): boolean {
  return !!code && REGION_CODES.includes(code);
}

export function getRegion(code?: string | null): Region | undefined {
  return REGIONS.find((r) => r.code === code);
}

/**
 * Prefix a real URL path with the active region.
 * localizedPath(undefined, "/blog") -> "/blog"
 * localizedPath("us", "/blog")      -> "/us/blog"
 * localizedPath("us", "/")          -> "/us"
 */
export function localizedPath(region: string | undefined, path: string): string {
  if (!region) return path;
  return path === "/" ? `/${region}` : `/${region}${path}`;
}

/**
 * Build hreflang <link rel="alternate"> entries for a given unprefixed base
 * path (e.g. "/blog"). Includes every region plus x-default -> the base path.
 * Emits absolute URLs when VITE_SITE_URL is configured.
 */
export function buildAlternateLinks(basePath: string): Array<Record<string, string>> {
  const base = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");
  const abs = (p: string) => `${base}${p.startsWith("/") ? p : `/${p}`}`;
  const suffix = basePath === "/" ? "" : basePath;
  const links = REGIONS.map((r) => ({
    rel: "alternate",
    hrefLang: r.hreflang,
    href: abs(`/${r.code}${suffix}` || "/"),
  }));
  links.push({ rel: "alternate", hrefLang: "x-default", href: abs(basePath) });
  return links;
}

