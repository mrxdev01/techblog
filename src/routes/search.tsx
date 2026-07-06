import { createFileRoute } from "@tanstack/react-router";
import { buildSeo } from "@/lib/seo";
import { SearchPage } from "@/components/pages/SearchPage";

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  head: () => buildSeo({ title: "Search Articles", description: "Search every Factonia article, guide, and explainer.", path: "/search", noindex: true }),
  component: SearchPage,
});
