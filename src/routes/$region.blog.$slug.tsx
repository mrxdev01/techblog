import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ArticleSkeleton } from "@/components/States";
import { RouteError, RouteNotFound } from "@/components/RouteBoundaries";
import { postBySlugQuery, postsQuery } from "@/lib/queries";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";
import { PostDetailPage } from "@/components/pages/PostDetailPage";
import type { PostWithRelations } from "@/lib/database.types";

export const Route = createFileRoute("/$region/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(postBySlugQuery(params.slug));
    if (!post) throw notFound();
    // Load related posts before SSR so the server and hydrated client render the same tree.
    await context.queryClient.ensureQueryData(
      postsQuery({ categorySlug: post.category?.slug, excludeId: post.id, limit: 3 }),
    );
    return post;
  },
  head: ({ loaderData, params }) => {
    const post = loaderData as PostWithRelations | undefined;
    if (!post)
      return { meta: [{ title: `Article not found | ${SITE.name}` }, { name: "robots", content: "noindex, follow" }] };
    return buildSeo({
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || SITE.description,
      path: localizedPath(params.region, `/blog/${post.slug}`),
      image: post.og_image || post.featured_image,
      type: "article",
      canonical: post.canonical_url,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      author: post.author?.name,
      alternates: `/blog/${post.slug}`,
    });
  },
  pendingComponent: () => (
    <SiteLayout>
      <ArticleSkeleton />
    </SiteLayout>
  ),
  errorComponent: ({ error, reset }) => <RouteError error={error as Error} reset={reset} variant="article" />,
  notFoundComponent: () => (
    <RouteNotFound title="Article not found" description="This article doesn't exist or may have been unpublished." />
  ),
  component: PostDetailPage,
});
