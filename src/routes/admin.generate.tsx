import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Globe, TrendingUp, ArrowRight, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { generatePost, type GenerateResult } from "@/lib/generate-post.functions";
import { ensureCategory, ensureTags, useUpsertPost, type PostFormValues } from "@/lib/admin-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/generate")({
  component: GeneratePage,
});

/** Markets offered for the multi-country analysis (Semrush database codes). */
const COUNTRIES: { code: string; label: string }[] = [
  { code: "in", label: "India" },
  { code: "us", label: "United States" },
  { code: "uk", label: "United Kingdom" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
  { code: "sg", label: "Singapore" },
  { code: "ae", label: "UAE" },
  { code: "za", label: "South Africa" },
  { code: "de", label: "Germany" },
  { code: "fr", label: "France" },
];

const DEFAULT_SELECTED = ["in", "us", "uk", "ca", "au"];

function GeneratePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const upsert = useUpsertPost();

  const [topic, setTopic] = useState("");
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTED);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  function toggleCountry(code: string) {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  }

  async function onGenerate() {
    const t = topic.trim();
    if (!t) return toast.error("Type a topic first.");
    const token = session?.access_token;
    if (!token) return toast.error("Your session expired — please sign in again.");
    setLoading(true);
    setResult(null);
    try {
      const res = await generatePost({ data: { topic: t, countries: selected, accessToken: token } });
      setResult(res);
      toast.success("Draft generated — review the analysis below.");
    } catch (e) {
      toast.error((e as Error).message || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCreateDraft() {
    if (!result) return;
    setSaving(true);
    try {
      const category_id = result.draft.category ? await ensureCategory(result.draft.category) : null;
      const tagIds = result.draft.tags.length ? await ensureTags(result.draft.tags) : [];
      const values: PostFormValues = {
        title: result.draft.title,
        slug: result.draft.slug,
        excerpt: result.draft.excerpt,
        content: result.draft.content,
        featured_image: null, // author uploads this
        image_alt: result.draft.image_alt || null,
        category_id,
        author_id: null,
        status: "draft",
        featured: false,
        trending: false,
        meta_title: result.draft.meta_title || null,
        meta_description: result.draft.meta_description || null,
        focus_keyword: result.draft.focus_keyword || null,
        canonical_url: null,
        og_title: result.draft.og_title || null,
        og_description: result.draft.og_description || null,
        og_image: null,
        faq_json: result.draft.faq_json,
        reading_time: result.draft.reading_time,
        published_at: null,
        tagIds,
      };
      const id = await upsert.mutateAsync(values);
      toast.success("Draft saved. Add a featured image, then publish.");
      navigate({ to: "/admin/posts/$id", params: { id } });
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save the draft.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">AI Writer</h1>
          <p className="text-sm text-muted-foreground">
            Type a topic. It researches demand across your target countries and writes a full SEO + AEO optimised post in English.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-5 rounded-xl border bg-card p-5 shadow-card">
        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && onGenerate()}
              placeholder="e.g. What is quantum computing in simple terms"
              disabled={loading}
            />
            <Button onClick={onGenerate} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {loading ? "Researching & writing…" : "Analyze & generate"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Target countries to analyze
          </Label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => {
              const on = selected.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  disabled={loading}
                  onClick={() => toggleCountry(c.code)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            It checks search volume &amp; ranking difficulty in each market, then writes for the one with the most scope.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Analyzing markets and writing your article — this usually takes 20–60 seconds.
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Market analysis */}
          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Market analysis</h2>
              {result.analysis.semrushUsed ? (
                <Badge variant="secondary">Semrush</Badge>
              ) : (
                <Badge variant="outline">AI research</Badge>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{result.analysis.note}</span>
            </div>

            {result.analysis.countries.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4">Country</th>
                      <th className="py-2 pr-4">Volume / mo</th>
                      <th className="py-2 pr-4">Difficulty</th>
                      <th className="py-2 pr-4">Rank chance</th>
                      <th className="py-2 pr-4">Est. visitors / mo</th>
                      <th className="py-2 pr-4">Opportunity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.analysis.countries.map((c) => (
                      <tr
                        key={c.code}
                        className={cn(
                          "border-b last:border-0",
                          c.code === result.analysis.bestCountryCode && "font-medium text-foreground",
                        )}
                      >
                        <td className="py-2 pr-4">
                          {c.country}
                          {c.code === result.analysis.bestCountryCode && (
                            <Badge className="ml-2 align-middle">Best</Badge>
                          )}
                        </td>
                        <td className="py-2 pr-4">{c.volume.toLocaleString()}</td>
                        <td className="py-2 pr-4">{c.difficulty}/100</td>
                        <td className="py-2 pr-4">{c.rankChance}%</td>
                        <td className="py-2 pr-4">{c.estVisitors.toLocaleString()}</td>
                        <td className="py-2 pr-4">{c.score.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.analysis.keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Related keywords targeted</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.analysis.keywords.map((k) => (
                    <Badge key={k} variant="secondary" className="font-normal">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.analysis.questions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Questions people ask (answered in the post)</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {result.analysis.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Draft preview */}
          <div className="space-y-3 rounded-xl border bg-card p-5 shadow-card">
            <h2 className="font-semibold">Generated draft</h2>
            <div className="space-y-1">
              <p className="text-lg font-bold">{result.draft.title}</p>
              <p className="text-sm text-muted-foreground">{result.draft.excerpt}</p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Focus keyword: <span className="text-foreground">{result.draft.focus_keyword}</span></span>
              <span>Category: <span className="text-foreground">{result.draft.category || "—"}</span></span>
              <span>~{result.draft.reading_time} min read</span>
              <span>{result.draft.faq_json.length} FAQs</span>
            </div>
            <div
              className="prose-content max-h-72 overflow-y-auto rounded-lg border bg-background/50 p-4 text-sm"
              dangerouslySetInnerHTML={{ __html: result.draft.content }}
            />
            <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Everything is filled in — you only add the featured image, then publish.
              </p>
              <Button onClick={onCreateDraft} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Open in editor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
