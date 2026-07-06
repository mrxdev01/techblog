import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/components/pages/AboutPage";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";

export const Route = createFileRoute("/about")({
  head: () =>
    buildSeo({
      title: `About ${SITE.name} — Our Mission & Editorial Standards`,
      description: `Learn about ${SITE.name} — our mission, editorial standards, and the people behind our clear, well-researched tech and science explainers.`,
      path: "/about",
      alternates: "/about",
    }),
  component: AboutPage,
});
