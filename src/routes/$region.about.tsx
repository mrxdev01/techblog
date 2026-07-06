import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/AboutPage";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const Route = createFileRoute("/$region/about")({
  head: ({ params }) =>
    buildSeo({
      title: `About ${SITE.name} — Our Mission & Editorial Standards`,
      description: `Learn about ${SITE.name} — our mission, editorial standards, and the people behind our clear, well-researched tech and science explainers.`,
      path: localizedPath(params.region, "/about"),
      alternates: "/about",
    }),
  component: AboutPage,
});
