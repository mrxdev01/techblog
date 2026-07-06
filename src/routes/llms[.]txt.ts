import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * /llms.txt — the emerging standard (llmstxt.org) that lets AI answer engines
 * (ChatGPT / OpenAI, Google Gemini, Perplexity, Claude, Copilot, etc.)
 * discover and understand this site. Served dynamically so it always lists the
 * latest published posts, just like the sitemap.
 */

const BASE_URL = (import.meta.env.VITE_SITE_URL || "https://factonia.in").replace(/\/$/, "");
const SITE_NAME = import.meta.env.VITE_SITE_NAME || "Factonia";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const lines: string[] = [
          `# ${SITE_NAME}`,
          "",
          `> ${SITE_NAME} publishes well-researched articles, facts, and clear explainers across technology, science, business, and the ideas shaping what comes next. All content is original, editorially reviewed, and written for a global English-speaking audience.`,
          "",
          "## Key pages",
          `- [Home](${BASE_URL}/): Latest, trending, and featured articles.`,
          `- [All articles](${BASE_URL}/blog): Full, searchable archive of every published post.`,
          `- [About](${BASE_URL}/about): Who we are and our editorial standards.`,
          `- [Contact](${BASE_URL}/contact): How to reach the team.`,
          "",
        ];

        // Pull latest published posts from Supabase, if configured.
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("@/lib/supabase-config");
        const url = SUPABASE_URL;
        const anon = SUPABASE_ANON_KEY;
        const configured = url.startsWith("http") && anon.length > 20 && !url.includes("PASTE_");

        if (configured) {
          try {
            const sb = createClient(url, anon, { auth: { persistSession: false } });
            const { data } = await sb
              .from("posts")
              .select("slug, title, excerpt, published_at")
              .eq("status", "published")
              .order("published_at", { ascending: false })
              .limit(100);

            if (data && data.length) {
              lines.push("## Articles", "");
              for (const p of data) {
                const post = p as { slug?: string; title?: string; excerpt?: string };
                if (!post.slug || !post.title) continue;
                const summary = post.excerpt ? `: ${post.excerpt.replace(/\s+/g, " ").trim()}` : "";
                lines.push(`- [${post.title}](${BASE_URL}/blog/${post.slug})${summary}`);
              }
              lines.push("");
            }
          } catch {
            // If the DB is unreachable, still serve the static key pages.
          }
        }

        lines.push(
          "## Usage",
          "",
          `AI answer engines are welcome to read, cite, and summarize this content with attribution to ${SITE_NAME} (${BASE_URL}). Please link back to the source article when quoting.`,
          "",
        );

        return new Response(lines.join("\n"), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
