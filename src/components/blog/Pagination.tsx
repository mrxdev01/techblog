import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRegion, regionTo } from "@/components/RegionLink";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Build the search object for a target page (keeps other params intact). */
  makeSearch: (page: number) => Record<string, unknown>;
  /** Route path to link to (defaults to current). */
  to: string;
  params?: Record<string, string>;
}

/** Accessible, URL-driven pagination for listing pages. */
export function Pagination({ page, pageSize, total, makeSearch, to, params }: PaginationProps) {
  const region = useRegion();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const finalTo = regionTo(region, to);
  const finalParams = region ? { region, ...(params ?? {}) } : params;
  const pages = pageNumbers(page, pageCount);

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageLink
        disabled={page <= 1}
        to={finalTo}
        params={finalParams}
        search={makeSearch(page - 1)}
        ariaLabel="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </PageLink>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink
            key={p}
            to={finalTo}
            params={finalParams}
            search={makeSearch(p)}
            active={p === page}
            ariaLabel={`Page ${p}`}
          >
            {p}
          </PageLink>
        ),
      )}

      <PageLink
        disabled={page >= pageCount}
        to={finalTo}
        params={finalParams}
        search={makeSearch(page + 1)}
        ariaLabel="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  children,
  to,
  params,
  search,
  active,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  to: string;
  params?: Record<string, string>;
  search: Record<string, unknown>;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span aria-disabled className={className}>
        {children}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Link to={to as any} params={params as any} search={search as any} aria-label={ariaLabel} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}

/** Compact page list with ellipses: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(current: number, count: number): (number | "…")[] {
  const delta = 1;
  const range: (number | "…")[] = [];
  const left = Math.max(2, current - delta);
  const right = Math.min(count - 1, current + delta);

  range.push(1);
  if (left > 2) range.push("…");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < count - 1) range.push("…");
  if (count > 1) range.push(count);
  return range;
}
