import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostCard } from "@/components/blog/PostCard";
import { ExploreCta } from "@/components/blog/ExploreCta";
import { EmptyState, NotConfiguredNotice } from "@/components/States";
import { HeaderAd, InArticleAd } from "@/components/ads/AdSlots";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/JsonLd";
import { RLink, useRegion } from "@/components/RegionLink";
import { postsQuery, categoriesQuery } from "@/lib/queries";
import { SITE, absoluteUrl } from "@/lib/config";
import { getRegion, localizedPath } from "@/lib/regions";

export const featuredOpts = postsQuery({ featured: true, limit: 3 });
export const latestOpts = postsQuery({ limit: 9, order: "recent" });
export const trendingOpts = postsQuery({ trending: true, limit: 5 });
export const popularOpts = postsQuery({ order: "popular", limit: 5 });

export function HomePage() {
  const region = useRegion();
  const regionMeta = getRegion(region);
  const { data: featured } = useSuspenseQuery(featuredOpts);
  const { data: latest } = useSuspenseQuery(latestOpts);
  const { data: trending } = useSuspenseQuery(trendingOpts);
  const { data: popular } = useSuspenseQuery(popularOpts);
  const { data: categories } = useSuspenseQuery(categoriesQuery());

  const heroPost = featured[0];

  return (
    <SiteLayout>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: absoluteUrl(localizedPath(region, "/")) || undefined,
          description: SITE.description,
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl(localizedPath(region, "/search"))}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-subtle">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
              <Sparkles className="h-3.5 w-3.5 text-primary" />{" "}
              {regionMeta ? `${regionMeta.label} edition` : "Fresh perspectives, every week"}
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] sm:text-6xl">
              Ideas that shape <span className="text-gradient">what comes next</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Sharp, in-depth writing on technology, product, and culture — for people who like to think.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <RLink to="/blog">
                  Read latest articles <ArrowRight className="ml-1 h-4 w-4" />
                </RLink>
              </Button>
              <Button asChild variant="outline" size="lg">
                <RLink to="/search" search={{ q: undefined }}>
                  Explore topics
                </RLink>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <NotConfiguredNotice />

        <div className="py-8">
          <HeaderAd />
        </div>

        {/* Featured */}
        <section className="py-6">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Featured</h2>
            <RLink to="/blog" className="text-sm font-medium text-primary hover:underline">
              View all
            </RLink>
          </div>
          {heroPost ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {featured.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No featured posts yet"
              description="Mark posts as Featured from the admin panel to showcase them here."
            />
          )}
        </section>

        {/* Latest + sidebar */}
        <section className="grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-6 text-2xl font-bold">Latest posts</h2>
            {latest.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {latest.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <EmptyState title="No posts published yet" description="Create your first post in the admin panel." />
            )}
          </div>

          <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
            {trending.length > 0 && (
              <div className="rounded-xl border bg-card p-5 shadow-card">
                <h3 className="mb-4 flex items-center gap-2 font-display font-bold">
                  <TrendingUp className="h-4 w-4 text-primary" /> Trending
                </h3>
                <div className="space-y-1">
                  {trending.map((p) => (
                    <PostCard key={p.id} post={p} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {popular.length > 0 && (
              <div className="rounded-xl border bg-card p-5 shadow-card">
                <h3 className="mb-4 font-display font-bold">Most read</h3>
                <div className="space-y-1">
                  {popular.map((p) => (
                    <PostCard key={p.id} post={p} variant="compact" />
                  ))}
                </div>
              </div>
            )}

            {categories.length > 0 && (
              <div className="rounded-xl border bg-card p-5 shadow-card">
                <h3 className="mb-4 font-display font-bold">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <RLink
                      key={c.id}
                      to="/category/$slug"
                      params={{ slug: c.slug }}
                      className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {c.name}
                    </RLink>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </section>

        <InArticleAd />

        <section className="py-12">
          <ExploreCta />
        </section>
      </div>
    </SiteLayout>
  );
}
