import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostGridSkeleton } from "@/components/States";
import { RouteError, RouteNotFound } from "@/components/RouteBoundaries";
import { postsPageQuery, tagBySlugQuery } from "@/lib/queries";
import { buildSeo } from "@/lib/seo";
import { localizedPath } from "@/lib/regions";
import { TagPage, PAGE_SIZE } from "@/components/pages/TagPage";

interface TagSearch {
  page: number;
}

export const Route = createFileRoute("/$region/tag/$slug")({
  validateSearch: (s: Record<string, unknown>): TagSearch => ({
    page: Math.max(1, Number(s.page) || 1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, params, deps }) => {
    const tag = await context.queryClient.ensureQueryData(tagBySlugQuery(params.slug));
    if (!tag) throw notFound();
    await context.queryClient.ensureQueryData(
      postsPageQuery({ tagSlug: params.slug, page: deps.page, pageSize: PAGE_SIZE }),
    );
    return { tag };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.tag?.name ?? params.slug.replace(/-/g, " ");
    return buildSeo({
      title: `${name} — Articles & Insights`,
      description: `All Factonia articles, guides, and insights tagged ${name}.`,
      path: localizedPath(params.region, `/tag/${params.slug}`),
      alternates: `/tag/${params.slug}`,
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
    <RouteNotFound title="Tag not found" description="This tag doesn't exist or has no posts yet." />
  ),
  component: TagPage,
});
