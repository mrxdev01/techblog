import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, FileEdit, FolderTree, Tag, Eye, Plus, ArrowRight, Sparkles } from "lucide-react";
import { adminStatsQuery, adminPostsQuery } from "@/lib/admin-queries";
import { useRealtimeBlog } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/blog-utils";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  useRealtimeBlog();
  const { data: stats, isLoading, isError } = useQuery(adminStatsQuery());
  const { data: posts } = useQuery(adminPostsQuery());
  const recent = (posts ?? []).slice(0, 6);

  const cards = [
    { label: "Total posts", value: stats?.posts, icon: FileText },
    { label: "Published", value: stats?.published, icon: CheckCircle2 },
    { label: "Drafts", value: stats?.drafts, icon: FileEdit },
    { label: "Categories", value: stats?.categories, icon: FolderTree },
    { label: "Tags", value: stats?.tags, icon: Tag },
    { label: "Total views", value: stats?.views, icon: Eye },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your content.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/generate"><Sparkles className="mr-2 h-4 w-4" /> AI Writer</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/posts/new"><Plus className="mr-2 h-4 w-4" /> New post</Link>
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load your dashboard stats. Check your connection and refresh.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <c.icon className="h-4 w-4 text-primary" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-16" />
            ) : (
              <p className="mt-2 text-3xl font-bold">{c.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card shadow-card">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">Recent posts</h2>
          <Link to="/admin/posts" className="flex items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y">
          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No posts yet. Create your first one.</p>
          ) : (
            recent.map((p) => (
              <Link
                key={p.id}
                to="/admin/posts/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
