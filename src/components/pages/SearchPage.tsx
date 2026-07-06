import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { PostCard } from "@/components/blog/PostCard";
import { PostGridSkeleton, EmptyState } from "@/components/States";
import { Input } from "@/components/ui/input";
import { useRegionNavigate } from "@/components/RegionLink";
import { postsQuery } from "@/lib/queries";

export function SearchPage() {
  const { q } = useSearch({ strict: false }) as { q?: string };
  const navigate = useRegionNavigate();
  const [term, setTerm] = useState(q ?? "");
  const [debounced, setDebounced] = useState(q ?? "");

  useEffect(() => setTerm(q ?? ""), [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(term.trim());
      navigate("/search", { search: { q: term.trim() || undefined } });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const { data, isLoading } = useQuery({
    ...postsQuery({ search: debounced, limit: 40 }),
    enabled: debounced.length > 1,
  });

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-4xl font-bold">Search</h1>
        <div className="relative mt-6 max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search articles by title or excerpt…"
            aria-label="Search articles"
            className="h-12 pl-11 text-base"
          />
        </div>

        <div className="mt-10">
          {debounced.length <= 1 ? (
            <EmptyState title="Start typing to search" description="Enter at least 2 characters." />
          ) : isLoading ? (
            <PostGridSkeleton count={6} />
          ) : data && data.length > 0 ? (
            <>
              <p className="mb-6 text-sm text-muted-foreground">
                {data.length} result{data.length === 1 ? "" : "s"} for “{debounced}”
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No results" description={`Nothing matched “${debounced}”. Try another term.`} />
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
