import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/components/pages/LegalPages";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const Route = createFileRoute("/$region/privacy")({
  head: ({ params }) =>
    buildSeo({
      title: "Privacy Policy — How We Handle Your Data",
      description: `How ${SITE.name} collects, uses, and protects your data, including cookies and analytics.`,
      path: localizedPath(params.region, "/privacy"),
      alternates: "/privacy",
    }),
  component: PrivacyPage,
});
