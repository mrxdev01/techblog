import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ExternalLink, Star, TrendingUp, Sparkles, Eye, EyeOff } from "lucide-react";
import { adminPostsQuery, useTogglePostFlag } from "@/lib/admin-queries";
import { useDeletePost, useRealtimeBlog } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/blog-utils";
import { cn } from "@/lib/utils";
import type { PostWithRelations } from "@/lib/database.types";

export const Route = createFileRoute("/admin/posts/")({
  component: PostsList,
});

type StatusFilter = "all" | "published" | "draft";

function PostsList() {
  useRealtimeBlog();
  const { data: posts, isLoading, isError } = useQuery(adminPostsQuery());
  const del = useDeletePost();
  const toggle = useTogglePostFlag();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [toDelete, setToDelete] = useState<PostWithRelations | null>(null);

  const filtered = useMemo(() => {
    return (posts ?? []).filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [posts, q, status]);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success("Post deleted");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setToDelete(null);
    }
  }

  async function flip(p: PostWithRelations, key: "featured" | "trending") {
    try {
      await toggle.mutateAsync({ id: p.id, patch: { [key]: !p[key] } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function flipStatus(p: PostWithRelations) {
    const publishing = p.status !== "published";
    try {
      await toggle.mutateAsync({
        id: p.id,
        patch: publishing
          ? { status: "published", published_at: p.published_at || new Date().toISOString() }
          : { status: "draft" },
      });
      toast.success(publishing ? "Post published" : "Post unpublished");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Posts</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/generate"><Sparkles className="mr-2 h-4 w-4" /> AI Writer</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/posts/new"><Plus className="mr-2 h-4 w-4" /> New post</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts…" className="pl-8" />
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {(["all", "published", "draft"] as const).map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "ghost"} className={cn("capitalize", status !== s && "text-muted-foreground")} onClick={() => setStatus(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-destructive">
            Couldn't load your posts. Check your connection and refresh.
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No posts match your filters.</p>
        ) : (
          <div className="divide-y">
            {filtered.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.title}</p>
                    <Badge variant={p.status === "published" ? "default" : "secondary"} className="shrink-0">{p.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.category?.name || "Uncategorized"} · {formatDate(p.created_at)} · {p.views_count} views
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" title="Toggle featured" onClick={() => flip(p, "featured")}>
                    <Star className={cn("h-4 w-4", p.featured ? "fill-primary text-primary" : "text-muted-foreground")} />
                  </Button>
                  <Button size="icon" variant="ghost" title="Toggle trending" onClick={() => flip(p, "trending")}>
                    <TrendingUp className={cn("h-4 w-4", p.trending ? "text-primary" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={p.status === "published" ? "Unpublish (move to draft)" : "Publish now"}
                    onClick={() => flipStatus(p)}
                    disabled={toggle.isPending}
                  >
                    {p.status === "published"
                      ? <EyeOff className="h-4 w-4 text-muted-foreground" />
                      : <Eye className="h-4 w-4 text-primary" />}
                  </Button>
                  {p.status === "published" && (
                    <Button size="icon" variant="ghost" asChild title="View live">
                      <Link to="/blog/$slug" params={{ slug: p.slug }} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" asChild title="Edit">
                    <Link to="/admin/posts/$id" params={{ id: p.id }}><Pencil className="h-4 w-4" /></Link>
                  </Button>
                  <Button size="icon" variant="ghost" title="Delete" onClick={() => setToDelete(p)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.title}” will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
