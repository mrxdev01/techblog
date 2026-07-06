import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState } from "@/components/States";
import { RouteNotFound } from "@/components/RouteBoundaries";
import { Pagination } from "@/components/blog/Pagination";
import { JsonLd } from "@/components/JsonLd";
import { RLink, useRegion } from "@/components/RegionLink";
import { postsPageQuery, tagBySlugQuery } from "@/lib/queries";
import { absoluteUrl, SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const PAGE_SIZE = 12;

export function TagPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { page: rawPage } = useSearch({ strict: false }) as { page?: number };
  const page = Math.max(1, rawPage ?? 1);
  const region = useRegion();
  const { data: tag } = useSuspenseQuery(tagBySlugQuery(slug));
  const { data } = useSuspenseQuery(postsPageQuery({ tagSlug: slug, page, pageSize: PAGE_SIZE }));

  // Defensive guard for transient client-navigation states (loader throws
  // notFound() when the tag is genuinely missing).
  if (!tag) {
    return <RouteNotFound title="Tag not found" description="This tag doesn't exist or has no posts yet." />;
  }

  return (
    <SiteLayout>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl(localizedPath(region, "/")) },
              {
                "@type": "ListItem",
                position: 2,
                name: `#${tag.name}`,
                item: absoluteUrl(localizedPath(region, `/tag/${slug}`)),
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `#${tag.name}`,
            description: `Articles tagged ${tag.name} on ${SITE.name}.`,
            url: absoluteUrl(localizedPath(region, `/tag/${slug}`)),
            isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url || undefined },
            mainEntity: {
              "@type": "ItemList",
              itemListElement: data.rows.map((p, i) => ({
                "@type": "ListItem",
                position: (page - 1) * PAGE_SIZE + i + 1,
                url: absoluteUrl(localizedPath(region, `/blog/${p.slug}`)),
                name: p.title,
              })),
            },
          },
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <RLink to="/" className="hover:text-foreground">Home</RLink>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">#{tag.name}</span>
        </nav>
        <h1 className="text-4xl font-bold">#{tag.name}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every {SITE.name} article tagged <span className="font-medium text-foreground">{tag.name}</span> — explainers,
          facts, and deep dives, newest first.
        </p>

        <div className="mt-8">
          {data.rows.length > 0 ? (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.rows.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={data.total}
                to="/tag/$slug"
                params={{ slug }}
                makeSearch={(p) => ({ page: p })}
              />
            </>
          ) : (
            <EmptyState title="No posts with this tag yet" />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
