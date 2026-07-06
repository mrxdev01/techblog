import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/components/pages/LegalPages";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildSeo({
      title: `Terms of Service — Rules for Using ${SITE.name}`,
      description: `The terms and conditions for using ${SITE.name}, including your rights and responsibilities.`,
      path: "/terms",
      alternates: "/terms",
    }),
  component: TermsPage,
});
