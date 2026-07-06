import { SITE, absoluteUrl } from "@/lib/config";
import { buildAlternateLinks } from "@/lib/regions";

/**
 * Branded fallback share image (public/og-cover.jpg) used whenever a page has
 * no more specific image. Guarantees every page — and every AI/social crawler
 * preview — shows a legible Factonia card instead of a blank/placeholder.
 */
const DEFAULT_OG_IMAGE = SITE.url ? absoluteUrl("/og-cover.jpg") : undefined;

interface SeoInput {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  canonical?: string | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  author?: string | null;
  noindex?: boolean;
  /**
   * Unprefixed base path (e.g. "/blog") for which to emit hreflang alternate
   * links across every region + x-default. Enables English geo-targeting.
   */
  alternates?: string;
}

/** Build a TanStack `head()` meta+links array with full OG/Twitter tags. */
export function buildSeo(input: SeoInput) {
  const title = input.title.includes(SITE.name) ? input.title : `${input.title} | ${SITE.name}`;
  const url = input.canonical || (input.path ? absoluteUrl(input.path) : SITE.url || undefined);
  const image = input.image || DEFAULT_OG_IMAGE;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: input.description },
    { property: "og:title", content: title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:site_name", content: SITE.name },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: input.description },
  ];

  if (url) {
    meta.push({ property: "og:url", content: url });
  }
  if (image) {
    meta.push({ property: "og:image", content: image });
    meta.push({ property: "og:image:alt", content: title });
    meta.push({ name: "twitter:image", content: image });
    meta.push({ name: "twitter:image:alt", content: title });
  }
  if (input.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }
  if (input.type === "article") {
    if (input.publishedTime) meta.push({ property: "article:published_time", content: input.publishedTime });
    if (input.modifiedTime) meta.push({ property: "article:modified_time", content: input.modifiedTime });
    if (input.author) meta.push({ property: "article:author", content: input.author });
  }

  const links: Array<Record<string, string>> = [];
  if (url) links.push({ rel: "canonical", href: url });
  if (input.alternates) links.push(...buildAlternateLinks(input.alternates));
  return { meta, links };
}
