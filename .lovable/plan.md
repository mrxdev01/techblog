# Factonia — SEO + AEO + GEO Master Plan

Goal: make **factonia.in** rank in Google, get cited by AI answer engines (ChatGPT, Gemini, Perplexity, Copilot, Claude), and win featured snippets / AI Overviews for India-focused factual/explainer content.

Good news first: the technical foundation is already strong — region hreflang routing, per-route `buildSeo()` (OG + Twitter + canonical), `BlogPosting` + `BreadcrumbList` + `FAQPage` JSON-LD on posts, an AI-bot-welcoming `robots.txt`, plus dynamic `sitemap.xml` and `llms.txt`. This plan fixes the remaining gaps and layers on the content + off-page work that actually moves rankings.

---

## Phase 1 — Technical SEO fixes (foundation)

These are code-level and quick.

1. **Fix the "Lovable App" fallback in `__root.tsx`** (critical bug). Lines 131–138 push `title: "Lovable App"`, `description: "Lovable Generated Project"` and a preview-URL og:image *after* the real tags. Since TanStack dedupes meta by name/property with last-one-wins, these override the good homepage title/description/image. Remove that block entirely.
2. **Confirm every leaf route self-references canonical + og:url** (blog, category, tag, about, contact, legal). Spot-check the non-region duplicate routes (`blog.$slug.tsx` vs `$region.blog.$slug.tsx`) don't emit conflicting canonicals.
3. **Verify Search Console + Bing Webmaster** are wired: `ANALYTICS.gscVerification` is set, submit `sitemap.xml`, and add the site to Bing (feeds ChatGPT/Copilot).
4. **Core Web Vitals pass**: featured images need explicit width/height + `loading="lazy"` (below fold) / `fetchpriority="high"` (LCP hero), and confirm fonts use `display=swap` (already set).
5. **Image SEO**: enforce descriptive `alt` text on every post image (editor + AI writer output).

## Phase 2 — Structured data upgrades (AEO backbone)

Rich structured data is what makes Google and AI engines *understand and cite* pages.

1. **Author entity**: add real `Person` schema with `sameAs` (author profile/social) instead of the current Organization fallback — strengthens E-E-A-T.
2. **Organization → publisher**: add `Organization` with `logo`, `sameAs`, and (if applicable) `foundingDate`/`address` for entity recognition in Knowledge Graph.
3. **Per-post enrichment**: ensure `BlogPosting` always has `datePublished`, `dateModified`, `author`, `image`, `wordCount`, `keywords`.
4. **FAQPage everywhere it fits**: the FAQ block already emits `FAQPage` — make FAQs a standard section in every explainer (3–5 Q&As). This is the single biggest AEO lever.
5. **Add `HowTo`** schema for step-based guides and **`ItemList`** for "best of / top N / comparison" list posts (drives AI Overview inclusion).
6. **Homepage/blog**: add `CollectionPage` + `ItemList` of latest posts so crawlers map the content hierarchy.

## Phase 3 — On-page content optimization (SEO)

1. **Topic clusters**: pick 4–6 pillar topics (tech, science, business, "how India works" explainers). Each pillar = one long guide + 8–12 supporting articles interlinking to it.
2. **Keyword-driven briefs**: for each article, target one primary + 3–5 secondary keywords. India market has openings in low-competition explainer/question keywords — I can run Semrush keyword research per topic to pick winners (Semrush, the SEO data service the platform integrates with, powers this).
3. **Answer-first structure**: H1 = the question/topic; first 40–60 words = a direct, quotable answer; then depth. This format wins both featured snippets and AI citations.
4. **Semantic H2/H3s phrased as real questions** ("What is X?", "How does X work in India?", "X vs Y") — matches voice + AI query patterns.
5. **Internal linking**: every post links to its pillar + 2–3 siblings with descriptive anchor text.
6. **Freshness**: keep `dateModified` accurate; refresh top posts quarterly.

## Phase 4 — AEO (Answer Engine Optimization)

Optimizing to *be the answer* in featured snippets, People Also Ask, and voice.

1. **Concise answer blocks**: after each H2 question, a 2–3 sentence summary before elaboration.
2. **Extractable formats**: tables (already styled), numbered steps, bulleted lists, and definition sentences ("X is …") — these are what engines lift.
3. **"Key takeaways" / TL;DR** callout near the top of each article.
4. **PAA mining**: pull real "People Also Ask" questions per topic and answer them as FAQ entries.
5. **Speakable schema** on the TL;DR/summary for voice assistants.

## Phase 5 — GEO (Generative Engine Optimization)

Optimizing to be *cited by* ChatGPT, Gemini, Perplexity, Copilot, Claude.

1. **`llms.txt` is already live** — extend it: add per-topic sections and a short site "about/editorial standards" summary so LLMs describe Factonia correctly.
2. **Citation-worthy content**: include specific statistics, dates, named sources, and original framing. Generative engines preferentially cite pages with concrete, verifiable facts.
3. **Cite primary sources** (link out to official data, studies) — signals trustworthiness to both Google E-E-A-T and LLM retrieval.
4. **Brand entity building**: consistent "Factonia" naming, an authoritative About page with editorial policy, author bios, and contact — LLMs synthesize entity identity from these.
5. **Quotable, self-contained paragraphs**: write sections that make sense out of context (LLMs retrieve chunks, not whole pages).
6. **Off-site presence**: get Factonia mentioned/listed where LLMs crawl (Wikipedia-adjacent sources, niche directories, Reddit, Quora) — LLM answers lean on these.

## Phase 6 — Off-page & authority

1. **Backlinks**: guest posts, digital-PR (data-driven articles get linked), HARO-style expert quotes, and niche India tech/science communities.
2. **Social signals**: distribute each post; set `SOCIAL_LINKS`/`sameAs` so entity graph connects.
3. **Google News / Discover eligibility**: consistent publishing cadence + proper `Article` schema opens Discover traffic (big for India).

## Phase 7 — Measurement & iteration

1. **GSC**: track impressions/clicks/position weekly; find "striking distance" (pos 11–20) pages to improve first.
2. **Semrush**: position tracking, competitor gap analysis, and traffic trend (currently no Semrush data — the domain is new/unindexed, so priority #1 is getting it crawled and indexed).
3. **AI-citation checks**: periodically query ChatGPT/Perplexity for target topics to see if Factonia is cited; iterate on the GEO tactics that work.
4. **Cadence**: publish consistently (e.g. 3–5 posts/week), refresh quarterly, re-audit technical SEO monthly.

---

## Suggested execution order

```
Week 1   Phase 1 (technical fixes) + Phase 2 (schema) + GSC/Bing + sitemap submit
Week 2   Phase 3 briefs for first pillar cluster + Phase 4 templates (FAQ/TL;DR)
Week 3+  Publish cluster content w/ AEO+GEO structure, start Phase 6 off-page
Ongoing  Phase 7 measurement, refresh, expand clusters
```

## Technical notes (for implementation)

- Files in play: `src/routes/__root.tsx` (fallback bug + Org/WebSite schema), `src/lib/seo.ts` (`buildSeo`), `src/components/JsonLd.tsx`, `src/components/pages/PostDetailPage.tsx` (Article/Breadcrumb/FAQ — add HowTo/ItemList/Speakable/author Person), `src/routes/llms[.]txt.ts`, `src/routes/sitemap[.]xml.ts`, and `src/components/admin/PostEditor.tsx` + AI writer (`generate-post.functions.ts`) so new content ships FAQ/TL;DR/alt-text/keywords by default.
- The AI writer is the highest-leverage place to bake in AEO/GEO structure — every future post inherits it automatically.

---

Want me to start with **Phase 1 (the technical fixes, including the `__root.tsx` bug)** right away, or first run **Semrush keyword research** on your top topics to ground the content briefs?
