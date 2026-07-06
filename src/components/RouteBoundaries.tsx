import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { ArticleSkeleton, ListPageSkeleton } from "@/components/States";
import {
  isRecoverableLoadError,
  autoReloadOnce,
  nextRecoverDelay,
  recoverAttemptCount,
  resetRecoverAttempts,
} from "@/lib/recover";

type RecoverVariant = "list" | "article";

/**
 * Resilient boundary for route loaders. Instead of ever showing a scary
 * "something went wrong" screen for a transient data / hydration / chunk
 * failure, it renders a skeleton that matches the page and silently re-runs
 * the loader on an exponential backoff. The user just sees a loading state
 * and the page fills in as soon as the data arrives — no error, no dead end.
 */
export function RouteError({
  error,
  reset,
  variant = "list",
}: {
  error: Error;
  reset: () => void;
  variant?: RecoverVariant;
}) {
  const router = useRouter();
  const recovering = isRecoverableLoadError(error);
  const [slow, setSlow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Stale-chunk / dropped-download errors: a hard reload fetches fresh
    // chunk URLs and fixes it instantly.
    if (recovering) {
      autoReloadOnce();
      return;
    }

    let cancelled = false;
    const delay = nextRecoverDelay();
    // After a couple of quiet retries, show a subtle "taking longer" hint —
    // still a skeleton, never an error.
    setSlow(recoverAttemptCount() > 2);

    timer.current = setTimeout(() => {
      if (cancelled) return;
      void router.invalidate();
      reset();
    }, delay);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [error, recovering, router, reset]);

  return (
    <SiteLayout>
      <div className="relative">
        {variant === "article" ? <ArticleSkeleton /> : <ListPageSkeleton />}
        {slow && (
          <p className="pointer-events-none pb-10 text-center text-sm text-muted-foreground">
            Taking a little longer than usual — loading your content…
          </p>
        )}
      </div>
    </SiteLayout>
  );
}

/** Not-found boundary for content routes. */
export function RouteNotFound({
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have been moved.",
}: {
  title?: string;
  description?: string;
}) {
  // Reaching a real, stable page means recovery succeeded — clear backoff.
  useEffect(() => {
    resetRecoverAttempts();
  }, []);

  return (
    <SiteLayout>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <span className="mb-5 text-6xl font-bold text-primary/30">404</span>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link to="/blog" search={{ page: 1, order: "recent" }}>Browse articles</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">
              <Home className="mr-1.5 h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
