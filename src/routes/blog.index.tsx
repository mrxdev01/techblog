import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostGridSkeleton, EmptyState } from "@/components/States";
import { RouteError } from "@/components/RouteBoundaries";
import { postsPageQuery, categoriesQuery, type PostFilter } from "@/lib/queries";
import { buildSeo } from "@/lib/seo";
import { BlogListPage, PAGE_SIZE } from "@/components/pages/BlogListPage";

type Order = NonNullable<PostFilter["order"]>;

interface BlogSearch {
  page: number;
  order: Order;
}

export const Route = createFileRoute("/blog/")({
  validateSearch: (s: Record<string, unknown>): BlogSearch => ({
    page: Math.max(1, Number(s.page) || 1),
    order: s.order === "popular" ? "popular" : "recent",
  }),
  loaderDeps: ({ search }) => ({ page: search.page, order: search.order }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        postsPageQuery({ order: deps.order, page: deps.page, pageSize: PAGE_SIZE }),
      ),
      context.queryClient.ensureQueryData(categoriesQuery()),
    ]);
  },
  head: () =>
    buildSeo({
      title: "All Articles — Tech, Science & Business",
      description: "Browse every Factonia article — clear, well-researched explainers and guides on technology, science, business, and culture.",
      path: "/blog",
      alternates: "/blog",
    }),
  pendingComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PostGridSkeleton count={9} />
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => <RouteError error={error as Error} reset={reset} />,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <EmptyState title="No posts yet" description="Published posts will appear here." />
      </div>
    </SiteLayout>
  ),
  component: BlogListPage,
});
