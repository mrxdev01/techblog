import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/pages/LegalPages";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const Route = createFileRoute("/$region/terms")({
  head: ({ params }) =>
    buildSeo({
      title: `Terms of Service — Rules for Using ${SITE.name}`,
      description: `The terms and conditions for using ${SITE.name}, including your rights and responsibilities.`,
      path: localizedPath(params.region, "/terms"),
      alternates: "/terms",
    }),
  component: TermsPage,
});
