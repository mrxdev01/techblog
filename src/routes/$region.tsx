import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { isValidRegion } from "@/lib/regions";

/**
 * Region layout. Country-code prefixed paths (e.g. /us, /in) serve the SAME
 * English content as the default site for SEO / geo-targeting. Any unknown
 * region code 404s so we never render garbage prefixes.
 *
 * Root routes like /blog and /about are more specific and always win over this
 * dynamic `$region` segment, so regionalization is purely additive.
 */
export const Route = createFileRoute("/$region")({
  beforeLoad: ({ params }) => {
    if (!isValidRegion(params.region)) throw notFound();
  },
  component: () => <Outlet />,
});
