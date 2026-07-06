import { Skeleton } from "@/components/ui/skeleton";
import { FileQuestion } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <Skeleton className="aspect-[16/9] w-full" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a listing page (heading + grid of cards). Matches the final
 * layout so the swap to real content feels instant, not jarring.
 */
export function ListPageSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <PostGridSkeleton count={count} />
    </div>
  );
}

/**
 * Skeleton for an article detail page — mirrors the header, hero image and
 * body paragraphs of a real post so the loading state reads as "content is
 * coming", never as a broken page.
 */
export function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="space-y-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-4/5" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
      <Skeleton className="mt-8 aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-8 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={i % 4 === 3 ? "h-4 w-2/3" : "h-4 w-full"} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <FileQuestion className="mb-4 h-10 w-10 text-muted-foreground/60" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <h3 className="font-semibold text-destructive">Something went wrong</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {message || "We couldn't load this content. Please try again."}
      </p>
    </div>
  );
}

/** Shown on public pages when Supabase keys are not yet configured. */
export function NotConfiguredNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mx-auto my-8 max-w-2xl rounded-xl border border-primary/30 bg-accent/50 p-5 text-sm">
      <p className="font-semibold text-accent-foreground">Connect your Supabase project</p>
      <p className="mt-1 text-muted-foreground">
        Paste your <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> into a{" "}
        <code className="rounded bg-muted px-1">.env</code> file, then run{" "}
        <code className="rounded bg-muted px-1">supabase/schema.sql</code> in your project. Content will
        appear here automatically.
      </p>
    </div>
  );
}
