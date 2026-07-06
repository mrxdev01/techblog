import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostCard } from "@/components/blog/PostCard";
import { EmptyState, NotConfiguredNotice } from "@/components/States";
import { Pagination } from "@/components/blog/Pagination";
import { ExploreCta } from "@/components/blog/ExploreCta";
import { Button } from "@/components/ui/button";
import { RLink, useRegionNavigate, useRegion } from "@/components/RegionLink";
import { getRegion } from "@/lib/regions";
import { postsPageQuery, categoriesQuery, type PostFilter } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 12;
type Order = NonNullable<PostFilter["order"]>;

export function BlogListPage() {
  const search = useSearch({ strict: false }) as { page?: number; order?: Order };
  const page = Math.max(1, search.page ?? 1);
  const order: Order = search.order === "popular" ? "popular" : "recent";
  const navigate = useRegionNavigate();
  const region = useRegion();
  const regionMeta = getRegion(region);
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const { data } = useSuspenseQuery(postsPageQuery({ order, page, pageSize: PAGE_SIZE }));

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-4xl font-bold">
            All Articles{regionMeta ? ` — ${regionMeta.label}` : ""}
          </h1>
          <p className="mt-2 text-muted-foreground">Everything we've published, freshest first.</p>
        </header>

        <NotConfiguredNotice />

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {(["recent", "popular"] as const).map((o) => (
              <Button
                key={o}
                size="sm"
                variant={order === o ? "default" : "ghost"}
                onClick={() => navigate("/blog", { search: { page: 1, order: o } })}
                className={cn("capitalize", order !== o && "text-muted-foreground")}
              >
                {o === "recent" ? "Latest" : "Popular"}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {categories.map((c) => (
              <RLink
                key={c.id}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {c.name}
              </RLink>
            ))}
          </div>
        </div>

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
              to="/blog"
              makeSearch={(p) => ({ page: p, order })}
            />
          </>
        ) : (
          <EmptyState title="No posts yet" description="Published posts will appear here." />
        )}

        <div className="py-14">
          <ExploreCta />
        </div>
      </div>
    </SiteLayout>
  );
}
