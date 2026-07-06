import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { REGIONS } from "@/lib/regions";

const BASE_URL = (import.meta.env.VITE_SITE_URL || "https://factonia.in").replace(/\/$/, "");

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  /** Emit hreflang alternates for every region + x-default. */
  alternates?: boolean;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderUrl(e: Entry): string {
  const loc = `${BASE_URL}${e.path}`;
  const lines = [`  <url>`, `    <loc>${xmlEscape(loc)}</loc>`];
  if (e.alternates) {
    for (const r of REGIONS) {
      const href = `${BASE_URL}/${r.code}${e.path === "/" ? "" : e.path}`;
      lines.push(`    <xhtml:link rel="alternate" hreflang="${r.hreflang}" href="${xmlEscape(href)}"/>`);
    }
    lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}"/>`);
  }
  if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
  if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
  if (e.priority) lines.push(`    <priority>${e.priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join("\n");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0", alternates: true },
          { path: "/blog", changefreq: "daily", priority: "0.9", alternates: true },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.2" },
          { path: "/terms", changefreq: "yearly", priority: "0.2" },
          { path: "/disclaimer", changefreq: "yearly", priority: "0.2" },
        ];

        // Pull published posts + taxonomy from Supabase, if configured.
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("@/lib/supabase-config");
        const url = SUPABASE_URL;
        const anon = SUPABASE_ANON_KEY;
        const configured = url.startsWith("http") && anon.length > 20 && !url.includes("PASTE_");

        if (configured) {
          try {
            const sb = createClient(url, anon, { auth: { persistSession: false } });
            const [posts, categories, tags] = await Promise.all([
              sb.from("posts").select("slug, updated_at").eq("status", "published"),
              sb.from("categories").select("slug"),
              sb.from("tags").select("slug"),
            ]);

            for (const p of posts.data ?? []) {
              const slug = (p as { slug?: string }).slug;
              const updated = (p as { updated_at?: string }).updated_at;
              if (!slug) continue;
              entries.push({
                path: `/blog/${slug}`,
                lastmod: updated ? new Date(updated).toISOString().slice(0, 10) : undefined,
                changefreq: "weekly",
                priority: "0.8",
                alternates: true,
              });
            }
            for (const c of categories.data ?? []) {
              const slug = (c as { slug?: string }).slug;
              if (slug) entries.push({ path: `/category/${slug}`, changefreq: "weekly", priority: "0.6" });
            }
            for (const t of tags.data ?? []) {
              const slug = (t as { slug?: string }).slug;
              if (slug) entries.push({ path: `/tag/${slug}`, changefreq: "weekly", priority: "0.4" });
            }
          } catch {
            // If the DB is unreachable at request time, still serve static routes.
          }
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...entries.map(renderUrl),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
