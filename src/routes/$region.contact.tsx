import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/pages/ContactPage";
import { buildSeo } from "@/lib/seo";
import { SITE } from "@/lib/config";
import { localizedPath } from "@/lib/regions";

export const Route = createFileRoute("/$region/contact")({
  head: ({ params }) =>
    buildSeo({
      title: `Contact ${SITE.name} — Questions, Feedback & Tips`,
      description: `Get in touch with the ${SITE.name} team — questions, feedback, story tips, and partnership enquiries.`,
      path: localizedPath(params.region, "/contact"),
      alternates: "/contact",
    }),
  component: ContactPage,
});
