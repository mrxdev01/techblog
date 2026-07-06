import { createFileRoute } from "@tanstack/react-router";
import { buildSeo } from "@/lib/seo";
import { localizedPath } from "@/lib/regions";
import { SearchPage } from "@/components/pages/SearchPage";

export const Route = createFileRoute("/$region/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  head: ({ params }) =>
    buildSeo({
      title: "Search Articles",
      description: "Search every Factonia article, guide, and explainer.",
      path: localizedPath(params.region, "/search"),
      noindex: true,
    }),
  component: SearchPage,
});
