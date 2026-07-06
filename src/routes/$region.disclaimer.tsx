import { createFileRoute } from "@tanstack/react-router";
import { DisclaimerPage } from "@/components/pages/LegalPages";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const Route = createFileRoute("/$region/disclaimer")({
  head: ({ params }) =>
    buildSeo({
      title: "Disclaimer — Editorial & Affiliate Notice",
      description: `Editorial, accuracy, and affiliate disclaimer for ${SITE.name} content.`,
      path: localizedPath(params.region, "/disclaimer"),
      alternates: "/disclaimer",
    }),
  component: DisclaimerPage,
});
