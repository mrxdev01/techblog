import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostGridSkeleton } from "@/components/States";
import { categoriesQuery } from "@/lib/queries";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import {
  HomePage,
  featuredOpts,
  latestOpts,
  trendingOpts,
  popularOpts,
} from "@/components/pages/HomePage";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const qc = context.queryClient;
    const [featured] = await Promise.all([
      qc.ensureQueryData(featuredOpts),
      qc.ensureQueryData(latestOpts),
      qc.ensureQueryData(trendingOpts),
      qc.ensureQueryData(popularOpts),
      qc.ensureQueryData(categoriesQuery()),
    ]);
    return { heroImage: featured?.[0]?.featured_image ?? null };
  },
  head: ({ loaderData }) =>
    buildSeo({
      title: `${SITE.name} — Facts, Explainers & Ideas on Tech & Science`,
      description: SITE.description,
      path: "/",
      image: loaderData?.heroImage ?? undefined,
      alternates: "/",
    }),
  pendingComponent: HomePending,
  component: HomePage,
});

function HomePending() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <PostGridSkeleton count={9} />
      </div>
    </SiteLayout>
  );
}
