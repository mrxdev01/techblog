import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, Calendar, RefreshCw, ChevronRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostCard } from "@/components/blog/PostCard";
import { ShareButtons } from "@/components/blog/ShareButtons";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { ExploreCta } from "@/components/blog/ExploreCta";
import { JsonLd } from "@/components/JsonLd";
import { InArticleAd, SidebarAd } from "@/components/ads/AdSlots";
import { RLink, useRegion } from "@/components/RegionLink";
import { RouteNotFound } from "@/components/RouteBoundaries";
import { postsQuery, postBySlugQuery, incrementViews } from "@/lib/queries";
import { formatDate, buildToc, sanitizeHtml } from "@/lib/blog-utils";
import { SITE, absoluteUrl, SOCIAL_LINKS } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

function decodeEntities(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Make each <table> responsive-friendly: on small screens CSS collapses rows
// into stacked cards using the column header stored in each cell's data-label.
function labelTableCells(tableHtml: string) {
  const headerMatch = tableHtml.match(/<thead[\s\S]*?<\/thead>/i);
  let headers: string[] = [];
  if (headerMatch) {
    headers = [...headerMatch[0].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) =>
      decodeEntities(m[1]),
    );
  } else {
    const firstRow = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (firstRow) {
      headers = [...firstRow[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) =>
        decodeEntities(m[1]),
      );
    }
  }
  if (!headers.length) return tableHtml;

  const bodyMatch = tableHtml.match(/<tbody[\s\S]*?<\/tbody>/i);
  const scope = bodyMatch ? bodyMatch[0] : tableHtml;
  const labelledScope = scope.replace(/<tr[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
    let i = 0;
    return row.replace(/<td(\s[^>]*)?>/gi, (open, attrs = "") => {
      const label = headers[i] ?? "";
      i += 1;
      if (/data-label=/i.test(open)) return open;
      return `<td${attrs || ""} data-label="${label.replace(/"/g, "&quot;")}">`;
    });
  });
  return bodyMatch ? tableHtml.replace(bodyMatch[0], labelledScope) : labelledScope;
}

function normalizeTableStructure(tableHtml: string) {
  if (/<thead[\s\S]*?<\/thead>/i.test(tableHtml)) {
    return tableHtml.replace(/<th(\s[^>]*)?>/gi, (open, attrs = "") =>
      /\bscope=/i.test(open) ? open : `<th${attrs || ""} scope="col">`,
    );
  }

  const rows = [...tableHtml.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  if (!rows.length) return tableHtml;

  const headerRow = rows[0].replace(/<td(\s[^>]*)?>/gi, (_open, attrs = "") => `<th${attrs || ""} scope="col">`).replace(/<\/td>/gi, "</th>");
  const bodyRows = rows.slice(1).join("");
  const tableOpen = tableHtml.match(/<table[^>]*>/i)?.[0] ?? "<table>";

  return `${tableOpen}<thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
}

function enhanceArticleHtml(html: string) {
  return (
    html
      // AI writers often hardcode light backgrounds/colors (e.g. white callout
      // boxes) that are invisible on the dark theme. Strip presentational
      // attributes so the site's own theme tokens govern all article styling.
      .replace(/\s(style|bgcolor|color|align|width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // Any div that reads like a callout/takeaways box → give it themed styling.
      .replace(
        /<div([^>]*\b(class|id)\s*=\s*("[^"]*"|'[^']*')[^>]*)?>(\s*<(?:h[2-6]|p|strong)[^>]*>\s*(?:[^<]*\b(key takeaways?|takeaways?|in short|summary|tl;dr|highlights?)\b[^<]*)<)/gi,
        '<div class="article-callout">$4',
      )
      // Add per-cell column labels for the mobile stacked-card layout.
      .replace(/<table[\s\S]*?<\/table>/gi, (t) => labelTableCells(normalizeTableStructure(t)))
      .replace(/<table(\s|>)/gi, '<div class="article-table-shell" tabindex="0"><table$1')
      .replace(/<\/table>/gi, "</table></div>")
  );
}

export function PostDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const region = useRegion();
  const { data: post } = useSuspenseQuery(postBySlugQuery(slug));

  const related = useSuspenseQuery(
    postsQuery({ categorySlug: post?.category?.slug, excludeId: post?.id, limit: 3 }),
  );

  useEffect(() => {
    if (post?.slug) incrementViews(post.slug);
  }, [post?.slug]);

  // The loader throws notFound() when the post is missing; this guards
  // transient client-navigation states so we never crash on undefined.
  if (!post) {
    return <RouteNotFound title="Article not found" description="This article doesn't exist or may have been unpublished." />;
  }

  const { toc, html } = buildToc(post.content);
  const cleanHtml = enhanceArticleHtml(sanitizeHtml(html));
  const url = absoluteUrl(localizedPath(region, `/blog/${post.slug}`));

  const faqs = post.faq_json ?? [];

  // Author E-E-A-T: emit a rich Person entity with any public profiles the
  // author has configured (drives the author knowledge panel + AI trust).
  const authorSameAs = post.author?.social_links
    ? Object.values(post.author.social_links).filter((u): u is string => typeof u === "string" && u.startsWith("http"))
    : [];
  const authorEntity = post.author
    ? {
        "@type": "Person",
        name: post.author.name,
        ...(post.author.bio ? { description: post.author.bio } : {}),
        ...(post.author.avatar ? { image: post.author.avatar } : {}),
        ...(authorSameAs.length ? { sameAs: authorSameAs } : {}),
      }
    : { "@type": "Organization", name: SITE.name };


  return (
    <SiteLayout>
      <ReadingProgress />

      {/* Structured data: Article + Breadcrumb (+ FAQ) */}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.meta_description || post.excerpt || "",
            image: post.featured_image ? [post.featured_image] : undefined,
            datePublished: post.published_at || post.created_at,
            dateModified: post.updated_at,
            author: authorEntity,
            publisher: {
              "@type": "Organization",
              name: SITE.name,
              logo: { "@type": "ImageObject", url: absoluteUrl("/favicon-512.png") },
              ...(SOCIAL_LINKS.length ? { sameAs: SOCIAL_LINKS } : {}),
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            url,
            ...(post.category ? { articleSection: post.category.name } : {}),
            inLanguage: "en",
            keywords: post.tags.map((t) => t.name).join(", ") || undefined,
            wordCount: post.content ? post.content.replace(/<[^>]+>/g, " ").split(/\s+/).length : undefined,
            // AEO/voice: point assistants at the headline + quick answer.
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: ["#article-title", "#article-summary"],
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl(localizedPath(region, "/")) },
              { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl(localizedPath(region, "/blog")) },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          },
          ...(faqs.length
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: faqs.map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                },
              ]
            : []),
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <RLink to="/" className="hover:text-foreground">Home</RLink>
          <ChevronRight className="h-3.5 w-3.5" />
          <RLink to="/blog" className="hover:text-foreground">Blog</RLink>
          {post.category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <RLink to="/category/$slug" params={{ slug: post.category.slug }} className="hover:text-foreground">
                {post.category.name}
              </RLink>
            </>
          )}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          {/* Article */}
          <article className="min-w-0">
            <header>
              {post.category && (
                <RLink
                  to="/category/$slug"
                  params={{ slug: post.category.slug }}
                  className="text-sm font-semibold uppercase tracking-wide text-primary hover:underline"
                >
                  {post.category.name}
                </RLink>
              )}
              <h1 id="article-title" className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{post.title}</h1>
              {post.excerpt && <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>}

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {post.author && <span className="font-medium text-foreground">{post.author.name}</span>}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> {formatDate(post.published_at || post.created_at)}
                </span>
                {post.updated_at && post.updated_at !== post.created_at && (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Updated {formatDate(post.updated_at)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {post.reading_time ?? 1} min read
                </span>
              </div>
            </header>

            {post.featured_image && (
              <img
                src={post.featured_image}
                alt={post.image_alt || post.title}
                className="mt-8 aspect-[16/9] w-full rounded-xl border object-cover"
                loading="eager"
                fetchPriority="high"
                width={1200}
                height={675}
              />
            )}

            {/* AEO: quick answer / key takeaways */}
            {post.excerpt && (
              <div className="mt-8 rounded-xl border border-primary/20 bg-accent/40 p-5">
                <h2 className="text-sm font-bold uppercase tracking-wide text-primary">In short</h2>
                <p id="article-summary" className="mt-2 text-[15px] leading-relaxed text-foreground/90">{post.excerpt}</p>
              </div>
            )}

            {/* Mobile TOC */}
            {toc.length > 0 && (
              <details className="mt-8 rounded-xl border bg-card p-4 lg:hidden">
                <summary className="cursor-pointer font-semibold">Table of contents</summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {toc.map((t) => (
                    <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                      <a href={`#${t.id}`} className="text-muted-foreground hover:text-primary">{t.text}</a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <div
              className="prose-content mt-8"
              // Sanitized above; content is admin-authored.
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />

            <InArticleAd />

            {/* FAQ (AEO) */}
            {faqs.length > 0 && (
              <section className="mt-12">
                <h2 className="text-2xl font-bold">Frequently asked questions</h2>
                <div className="mt-4 divide-y rounded-xl border bg-card">
                  {faqs.map((f, i) => (
                    <details key={i} className="group p-5">
                      <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                        {f.question}
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <RLink
                    key={t.id}
                    to="/tag/$slug"
                    params={{ slug: t.slug }}
                    className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-accent"
                  >
                    #{t.name}
                  </RLink>
                ))}
              </div>
            )}

            <div className="mt-8 border-t pt-6">
              <ShareButtons title={post.title} url={url} />
            </div>

            {/* Author bio */}
            {post.author && (
              <div className="mt-10 flex gap-4 rounded-xl border bg-card p-6">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                  {post.author.avatar && (
                    <img src={post.author.avatar} alt={post.author.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-display font-bold">{post.author.name}</p>
                  {post.author.bio && <p className="mt-1 text-sm text-muted-foreground">{post.author.bio}</p>}
                  {authorSameAs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {Object.entries(post.author.social_links ?? {})
                        .filter(([, u]) => typeof u === "string" && u.startsWith("http"))
                        .map(([label, u]) => (
                          <a
                            key={label}
                            href={u as string}
                            target="_blank"
                            rel="noopener noreferrer me"
                            className="font-medium capitalize text-primary hover:underline"
                          >
                            {label}
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </article>

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              {toc.length > 0 && (
                <nav className="rounded-xl border bg-card p-5" aria-label="Table of contents">
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">On this page</h2>
                  <ul className="space-y-2 text-sm">
                    {toc.map((t) => (
                      <li key={t.id} className={t.level === 3 ? "pl-3" : ""}>
                        <a href={`#${t.id}`} className="text-muted-foreground transition-colors hover:text-primary">
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <SidebarAd />
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.data && related.data.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Related articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.data.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}

        <div className="py-14">
          <ExploreCta />
        </div>
      </div>
    </SiteLayout>
  );
}
