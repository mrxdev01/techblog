import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostGridSkeleton } from "@/components/States";
import { RouteError, RouteNotFound } from "@/components/RouteBoundaries";
import { postsPageQuery, categoryBySlugQuery } from "@/lib/queries";
import { buildSeo } from "@/lib/seo";
import { localizedPath } from "@/lib/regions";
import { CategoryPage, PAGE_SIZE } from "@/components/pages/CategoryPage";

interface CategorySearch {
  page: number;
}

export const Route = createFileRoute("/$region/category/$slug")({
  validateSearch: (s: Record<string, unknown>): CategorySearch => ({
    page: Math.max(1, Number(s.page) || 1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const category = await context.queryClient.ensureQueryData(categoryBySlugQuery(params.slug));
    if (!category) throw notFound();
    await context.queryClient.ensureQueryData(
      postsPageQuery({ categorySlug: params.slug, page: deps.page, pageSize: PAGE_SIZE }),
    );
    return { category };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.category?.name ?? params.slug.replace(/-/g, " ");
    return buildSeo({
      title: `${name} — Articles, Guides & Explainers`,
      description:
        loaderData?.category?.description ||
        `Explore ${name} on Factonia — clear, well-researched articles, guides, and explainers.`,
      path: localizedPath(params.region, `/category/${params.slug}`),
      alternates: `/category/${params.slug}`,
    });
  },
  pendingComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <PostGridSkeleton count={6} />
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => <RouteError error={error as Error} reset={reset} />,
  notFoundComponent: () => (
    <RouteNotFound title="Category not found" description="This category doesn't exist or has no posts yet." />
  ),
  component: CategoryPage,
});
