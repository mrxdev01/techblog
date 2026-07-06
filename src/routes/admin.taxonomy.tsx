import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Upload, ImageIcon } from "lucide-react";
import { categoriesQuery, tagsQuery, authorsQuery, useRealtimeBlog } from "@/lib/queries";
import {
  useCreateCategory, useDeleteCategory,
  useCreateTag, useDeleteTag,
  useCreateAuthor, useUpdateAuthor, useDeleteAuthor,
  uploadBlogImage,
} from "@/lib/admin-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/blog-utils";

export const Route = createFileRoute("/admin/taxonomy")({
  component: Taxonomy,
});

function Taxonomy() {
  useRealtimeBlog();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Taxonomy</h1>
        <p className="text-muted-foreground">Manage categories, tags and authors.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Categories />
        <TagsPanel />
        <Authors />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Categories() {
  const { data = [] } = useQuery(categoriesQuery());
  const create = useCreateCategory();
  const del = useDeleteCategory();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function add() {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), slug: slugify(name), description: description.trim() || undefined });
      setName(""); setDescription("");
      toast.success("Category added");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Panel title="Categories">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Name</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering" />
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
        <Button size="sm" onClick={add} disabled={create.isPending} className="w-full">
          {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add category
        </Button>
      </div>
      <ul className="divide-y">
        {data.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span>{c.name}</span>
            <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id, { onSuccess: () => toast.success("Deleted"), onError: (e) => toast.error((e as Error).message) })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </li>
        ))}
        {data.length === 0 && <li className="py-2 text-sm text-muted-foreground">None yet.</li>}
      </ul>
    </Panel>
  );
}

function TagsPanel() {
  const { data = [] } = useQuery(tagsQuery());
  const create = useCreateTag();
  const del = useDeleteTag();
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), slug: slugify(name) });
      setName("");
      toast.success("Tag added");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Panel title="Tags">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. react" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button size="sm" onClick={add} disabled={create.isPending}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {data.map((t) => (
          <li key={t.id} className="flex items-center gap-1 rounded-full border bg-secondary px-3 py-1 text-xs">
            {t.name}
            <button onClick={() => del.mutate(t.id, { onSuccess: () => toast.success("Deleted"), onError: (e) => toast.error((e as Error).message) })}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-muted-foreground">None yet.</li>}
      </ul>
    </Panel>
  );
}

function Authors() {
  const { data = [] } = useQuery(authorsQuery());
  const create = useCreateAuthor();
  const update = useUpdateAuthor();
  const del = useDeleteAuthor();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadBlogImage(file);
      setAvatar(url);
      toast.success("Image uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setUploading(false); }
  }

  function reset() {
    setName(""); setBio(""); setAvatar(null); setEditingId(null);
  }

  async function save() {
    if (!name.trim()) return;
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, name: name.trim(), bio: bio.trim() || null, avatar });
        toast.success("Author updated");
      } else {
        await create.mutateAsync({ name: name.trim(), bio: bio.trim() || undefined, avatar: avatar || undefined });
        toast.success("Author added");
      }
      reset();
    } catch (e) { toast.error((e as Error).message); }
  }

  function startEdit(a: { id: string; name: string; bio: string | null; avatar: string | null }) {
    setEditingId(a.id);
    setName(a.name);
    setBio(a.bio ?? "");
    setAvatar(a.avatar ?? null);
  }

  const busy = create.isPending || update.isPending;

  return (
    <Panel title="Authors">
      <div className="space-y-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Author name" />
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio (optional)" rows={2} />
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} alt="Author avatar" className="h-14 w-14 rounded-full border object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickAvatar(e.target.files?.[0])} />
            <span className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Photo
            </span>
          </label>
          {avatar && <Button variant="ghost" size="sm" onClick={() => setAvatar(null)}>Remove</Button>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy} className="flex-1">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {editingId ? "Save changes" : "Add author"}
          </Button>
          {editingId && <Button size="sm" variant="outline" onClick={reset}>Cancel</Button>}
        </div>
      </div>
      <ul className="divide-y">
        {data.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              {a.avatar ? (
                <img src={a.avatar} alt={a.name} className="h-8 w-8 shrink-0 rounded-full border object-cover" />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="truncate">{a.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => startEdit(a)}>Edit</Button>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id, { onSuccess: () => { toast.success("Deleted"); if (editingId === a.id) reset(); }, onError: (e) => toast.error((e as Error).message) })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
        {data.length === 0 && <li className="py-2 text-sm text-muted-foreground">None yet.</li>}
      </ul>
    </Panel>
  );
}
