import { createFileRoute } from "@tanstack/react-router";
import { DisclaimerPage } from "@/components/pages/LegalPages";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";

export const Route = createFileRoute("/disclaimer")({
  head: () =>
    buildSeo({
      title: "Disclaimer — Editorial & Affiliate Notice",
      description: `Editorial, accuracy, and affiliate disclaimer for ${SITE.name} content.`,
      path: "/disclaimer",
      alternates: "/disclaimer",
    }),
  component: DisclaimerPage,
});
