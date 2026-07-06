import { Link, useParams, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { isValidRegion } from "@/lib/regions";

/** Read the active region code (undefined on the default/global site). */
export function useRegion(): string | undefined {
  const params = useParams({ strict: false }) as { region?: string };
  return isValidRegion(params.region) ? params.region : undefined;
}

/** Map an unprefixed route template to its region-prefixed equivalent. */
export function regionTo(region: string | undefined, base: string): string {
  if (!region) return base;
  if (base === "/") return "/$region";
  return `/$region${base}`;
}

interface RLinkProps {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  className?: string;
  activeProps?: Record<string, unknown>;
  onClick?: () => void;
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * Region-aware <Link>. Pass the plain route template (e.g. "/blog/$slug");
 * when a region is active it automatically links to the region variant and
 * carries the region param, so browsing stays inside the chosen country.
 */
export function RLink({ to, params, search, children, ...rest }: RLinkProps) {
  const region = useRegion();
  const finalTo = regionTo(region, to);
  const finalParams = region ? { region, ...(params ?? {}) } : params;
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={finalTo as any} params={finalParams as any} search={search as any} {...rest}>
      {children}
    </Link>
  );
}

/** Region-aware programmatic navigation helper. */
export function useRegionNavigate() {
  const navigate = useNavigate();
  const region = useRegion();
  return (base: string, opts?: { params?: Record<string, string>; search?: Record<string, unknown> }) => {
    const to = regionTo(region, base);
    const params = region ? { region, ...(opts?.params ?? {}) } : opts?.params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: to as any, params: params as any, search: opts?.search as any });
  };
}
