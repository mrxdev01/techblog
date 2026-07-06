import { RLink } from "@/components/RegionLink";
import { Clock, TrendingUp } from "lucide-react";
import type { PostWithRelations } from "@/lib/database.types";
import { formatDate } from "@/lib/blog-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PostCardProps {
  post: PostWithRelations;
  variant?: "default" | "compact" | "featured";
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  const readMins = post.reading_time ?? 1;

  if (variant === "compact") {
    return (
      <RLink
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-muted/60"
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {post.featured_image && (
            <img
              src={post.featured_image}
              alt={post.image_alt || post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          )}
        </div>
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {post.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.published_at)}</p>
        </div>
      </RLink>
    );
  }

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant",
        variant === "featured" && "sm:col-span-2 lg:col-span-2",
      )}
    >
      <RLink to="/blog/$slug" params={{ slug: post.slug }} className="block">
        <div className="relative aspect-video overflow-hidden bg-muted">
          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.image_alt || post.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-primary/10">
              <span className="font-display text-3xl text-primary/40">{post.title.slice(0, 1)}</span>
            </div>
          )}
          {post.trending && (
            <Badge className="absolute left-3 top-3 gap-1 bg-primary text-primary-foreground">
              <TrendingUp className="h-3 w-3" /> Trending
            </Badge>
          )}
        </div>
      </RLink>
      <div className="p-5">
        <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
          {post.category && (
            <RLink
              to="/category/$slug"
              params={{ slug: post.category.slug }}
              className="font-semibold uppercase tracking-wide text-primary hover:underline"
            >
              {post.category.name}
            </RLink>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {readMins} min read
          </span>
        </div>
        <RLink to="/blog/$slug" params={{ slug: post.slug }}>
          <h3
            className={cn(
              "font-display font-bold leading-tight transition-colors group-hover:text-primary",
              variant === "featured" ? "text-2xl" : "text-lg",
            )}
          >
            {post.title}
          </h3>
        </RLink>
        {post.excerpt && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>{post.author?.name || "Nebula"}</span>
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
        </div>
      </div>
    </article>
  );
}
