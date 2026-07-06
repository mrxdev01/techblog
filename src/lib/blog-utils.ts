import { parseISO } from "date-fns";

/**
 * Lightweight HTML sanitizer for rendered article content.
 * Content is admin-authored (trusted) but we still strip scripts, event
 * handlers, and javascript: URLs as defense-in-depth against stored XSS.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    // Strip dangerous embeds, but preserve iframes (handled separately below).
    .replace(/<\s*(script|style|object|embed|form)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|object|embed|form)[^>]*\/?>/gi, "")
    // Remove any iframe whose src is not an allowed video-embed provider.
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, (tag) => (isAllowedEmbed(tag) ? tag : ""))
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, "$1=$2#");
}

/** Allow-list of hosts we permit inside <iframe> embeds. */
const ALLOWED_EMBED_HOSTS = [
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "player.vimeo.com",
  "www.loom.com",
  "loom.com",
  "fast.wistia.net",
  "www.dailymotion.com",
  "dailymotion.com",
];

function isAllowedEmbed(iframeTag: string): boolean {
  const match = iframeTag.match(/\bsrc\s*=\s*("|')(.*?)\1/i);
  if (!match) return false;
  try {
    const host = new URL(match[2], "https://x").hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.includes(host);
  } catch {
    return false;
  }
}

/** Extract h2/h3 headings from HTML for a table of contents. */
export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function buildToc(html: string | null | undefined): { html: string; toc: TocItem[] } {
  if (!html) return { html: "", toc: [] };
  const toc: TocItem[] = [];
  const withIds = html.replace(/<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi, (_m, lvl, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugify(text) || `section-${toc.length + 1}`;
    toc.push({ id, text, level: Number(lvl) as 2 | 3 });
    return `<h${lvl} id="${id}"${attrs || ""}>${inner}</h${lvl}>`;
  });
  return { html: withIds, toc };
}


/** URL-safe slug from any title. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Rough reading time in minutes from HTML/markdown content. */
export function readingTime(content: string | null | undefined): number {
  if (!content) return 1;
  const text = content.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) return "";
    // Format in UTC so server (UTC) and browser (any timezone) render the
    // exact same string — prevents hydration mismatches on post dates.
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return "";
  }
}

export function formatDateISO(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return parseISO(value).toISOString();
  } catch {
    return "";
  }
}

/** Strip tags + truncate — used for excerpts / meta descriptions fallbacks. */
export function plainText(html: string | null | undefined, max = 160): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}\u2026` : text;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
