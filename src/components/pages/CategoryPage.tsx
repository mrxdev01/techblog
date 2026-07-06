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
import { postsPageQuery, categoryBySlugQuery } from "@/lib/queries";
import { absoluteUrl, SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const PAGE_SIZE = 12;

export function CategoryPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { page: rawPage } = useSearch({ strict: false }) as { page?: number };
  const page = Math.max(1, rawPage ?? 1);
  const region = useRegion();
  const { data: category } = useSuspenseQuery(categoryBySlugQuery(slug));
  const { data } = useSuspenseQuery(postsPageQuery({ categorySlug: slug, page, pageSize: PAGE_SIZE }));

  // The loader throws notFound() when the category is missing, so this is a
  // defensive guard for transient client-navigation states — never a crash.
  if (!category) {
    return <RouteNotFound title="Category not found" description="This category doesn't exist or has no posts yet." />;
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
                name: category.name,
                item: absoluteUrl(localizedPath(region, `/category/${slug}`)),
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: category.name,
            description: category.description || `Articles in ${category.name} on ${SITE.name}.`,
            url: absoluteUrl(localizedPath(region, `/category/${slug}`)),
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
          <span className="text-foreground">{category.name}</span>
        </nav>
        <h1 className="text-4xl font-bold capitalize">{category.name}</h1>
        {category.description && <p className="mt-2 max-w-2xl text-muted-foreground">{category.description}</p>}

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
                to="/category/$slug"
                params={{ slug }}
                makeSearch={(p) => ({ page: p })}
              />
            </>
          ) : (
            <EmptyState title="No posts in this category yet" />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
