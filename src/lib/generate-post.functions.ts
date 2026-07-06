import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * AI Auto-Post Generator (server side).
 *
 * Flow:
 *  1. Verify the caller is an authenticated admin (token → getUser → has_role).
 *  2. Run a multi-country Semrush keyword pass for the topic (if the Semrush
 *     connector is linked) to find where the topic has the most search demand
 *     and the best chance to rank.
 *  3. Generate a fully SEO + AEO optimised, English-language article via the
 *     Lovable AI Gateway, filling every editor field.
 *
 * Nothing is written to the database here — the client saves the returned
 * draft with the admin's own Supabase session, so RLS still applies.
 */

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const SEMRUSH_URL = "https://connector-gateway.lovable.dev/semrush/keywords";

/** Semrush "database" code → human label. Extend freely. */
const COUNTRY_LABELS: Record<string, string> = {
  in: "India",
  us: "United States",
  uk: "United Kingdom",
  ca: "Canada",
  au: "Australia",
  de: "Germany",
  fr: "France",
  es: "Spain",
  it: "Italy",
  nl: "Netherlands",
  br: "Brazil",
  sg: "Singapore",
  ae: "United Arab Emirates",
  za: "South Africa",
  nz: "New Zealand",
  ie: "Ireland",
  ph: "Philippines",
  pk: "Pakistan",
  ng: "Nigeria",
};

export interface CountryInsight {
  code: string;
  country: string;
  /** Estimated monthly Google searches for the topic. */
  volume: number;
  /** Keyword difficulty 0–100 (higher = harder to rank). */
  difficulty: number;
  /** Cost-per-click (commercial value signal). */
  cpc: number;
  /** Realistic chance (0–100%) of ranking on page 1 for this site. */
  rankChance: number;
  /** Estimated monthly visitors this site could win if it ranks well. */
  estVisitors: number;
  /** Opportunity score = volume weighted by ease of ranking. */
  score: number;
}

export interface GenerateResult {
  analysis: {
    /** "semrush" = real API data, "ai" = AI-estimated research. */
    dataSource: "semrush" | "ai" | "none";
    semrushUsed: boolean;
    bestCountry: string | null;
    bestCountryCode: string | null;
    countries: CountryInsight[];
    keywords: string[];
    /** Real questions people ask about the topic (from AI research). */
    questions: string[];
    note: string;
  };
  draft: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    meta_title: string;
    meta_description: string;
    focus_keyword: string;
    og_title: string;
    og_description: string;
    image_alt: string;
    reading_time: number;
    faq_json: { question: string; answer: string }[];
    tags: string[];
    category: string;
  };
}

interface GenerateInput {
  topic: string;
  countries: string[];
  accessToken: string;
}

function slugifyServer(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Semrush export-column codes → the human-readable names it returns. */
const COLUMN_ALIAS: Record<string, string> = {
  Ph: "Keyword",
  Nq: "Search Volume",
  Cp: "CPC",
  Kd: "Keyword Difficulty Index",
  Co: "Competition",
};

/** Read one column value from a Semrush { columnNames, rows } payload by code. */
function readCell(columnNames: string[], row: unknown, code: string): string {
  const name = COLUMN_ALIAS[code] ?? code;
  const idx = columnNames.indexOf(name) >= 0 ? columnNames.indexOf(name) : columnNames.indexOf(code);
  if (Array.isArray(row)) {
    return idx >= 0 ? String(row[idx] ?? "") : "";
  }
  if (row && typeof row === "object") {
    const rec = row as Record<string, unknown>;
    return String(rec[name] ?? rec[code] ?? "");
  }
  return "";
}

/** Shared holder so a quota/auth error from any country call surfaces to the UI. */
interface SemrushError {
  message: string | null;
}

async function fetchSemrush(
  path: string,
  params: Record<string, string>,
  lovableKey: string,
  semrushKey: string,
  errSink: SemrushError,
  extraHeaders: Record<string, string> = {},
): Promise<{ columnNames: string[]; rows: unknown[] } | null> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SEMRUSH_URL}/${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": semrushKey,
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => null)) as
    | { data?: { columnNames?: string[]; rows?: unknown[] }; error?: string }
    | null;
  if (!json || json.error || !json.data?.columnNames) {
    // Capture a meaningful error (quota, auth) so the UI can explain it.
    const raw = json?.error || (res.ok ? "" : `HTTP ${res.status}`);
    if (raw && !errSink.message) {
      if (/limit exceeded|error 13[0-9]/i.test(raw)) {
        errSink.message =
          "Your Semrush API quota is used up. Free/trial plans have a daily cap — wait for it to reset or upgrade your Semrush plan, then try again.";
      } else if (/unauthor|forbidden|401|403/i.test(raw)) {
        errSink.message =
          "Semrush rejected the request (auth/permission). Reconnect your Semrush account, then try again.";
      } else {
        errSink.message = `Semrush error: ${raw}`;
      }
    }
    return null;
  }
  return { columnNames: json.data.columnNames, rows: json.data.rows ?? [] };
}


async function runSemrush(
  topic: string,
  countries: string[],
  lovableKey: string,
  semrushKey: string,
): Promise<{ countries: CountryInsight[]; keywords: string[]; error: string | null }> {
  const insights: CountryInsight[] = [];
  const errSink: SemrushError = { message: null };

  await Promise.all(
    countries.map(async (code) => {
      try {
        const data = await fetchSemrush(
          "phrase_this",
          { phrase: topic, database: code, export_columns: "Ph,Nq,Cp,Kd,Co" },
          lovableKey,
          semrushKey,
          errSink,
        );
        const row = data?.rows?.[0];
        if (!data || !row) return;
        const volume = parseInt(readCell(data.columnNames, row, "Nq") || "0", 10) || 0;
        const difficulty = Math.round(parseFloat(readCell(data.columnNames, row, "Kd") || "0")) || 0;
        const cpc = parseFloat(readCell(data.columnNames, row, "Cp") || "0") || 0;
        const ease = Math.max(0, 100 - Math.min(100, difficulty)) / 100;
        insights.push({
          code,
          country: COUNTRY_LABELS[code] ?? code.toUpperCase(),
          volume,
          difficulty,
          cpc,
          rankChance: Math.round(ease * 100),
          estVisitors: Math.round(volume * ease * 0.3),
          score: Math.round(volume * ease),
        });
      } catch {
        /* skip a country that errors */
      }
    }),
  );

  insights.sort((a, b) => b.score - a.score || b.volume - a.volume);

  // Pull related long-tail keywords from the strongest market.
  let keywords: string[] = [];
  const best = insights[0];
  if (best) {
    try {
      const rel = await fetchSemrush(
        "phrase_related",
        { phrase: topic, database: best.code, export_columns: "Ph,Nq,Kd", display_limit: "15" },
        lovableKey,
        semrushKey,
        errSink,
        { "Allow-Limit-Offset": "true" },
      );
      if (rel) {
        keywords = rel.rows
          .map((r) => readCell(rel.columnNames, r, "Ph"))
          .filter(Boolean)
          .slice(0, 12);
      }
    } catch {
      /* related keywords are optional */
    }
  }

  return { countries: insights, keywords, error: errSink.message };
}


/**
 * AI-powered market research (Semrush fallback / free alternative).
 *
 * Uses the Lovable AI Gateway (Gemini) with its up-to-date world knowledge to
 * ESTIMATE, per selected country: monthly search demand, ranking difficulty,
 * a realistic chance for a growing site to rank, and the monthly visitors that
 * could be won. Also returns related keywords and the real questions people
 * ask. These are informed estimates, not measured data — but they give the
 * writer everything it needs to pick the best market and optimise the post.
 */
async function runAiResearch(
  topic: string,
  countries: string[],
  lovableKey: string,
): Promise<{ countries: CountryInsight[]; keywords: string[]; questions: string[] }> {
  const targetList = countries.length
    ? countries.map((c) => `${c} (${COUNTRY_LABELS[c] ?? c.toUpperCase()})`).join(", ")
    : "in (India), us (United States), uk (United Kingdom), ca (Canada), au (Australia)";

  const system =
    "You are a senior SEO market-research analyst with up-to-date knowledge of global Google search behaviour. " +
    "You give realistic, well-calibrated estimates for search demand and ranking potential. " +
    "For a NEW/GROWING blog, high-volume + high-difficulty terms have a LOW ranking chance, while lower-competition long-tail terms have a HIGHER chance. Reflect that in your numbers.";

  const user = [
    `Topic / target keyword: "${topic}".`,
    `Research the topic across these markets (Semrush-style database codes): ${targetList}.`,
    "",
    "For EACH country estimate realistic values:",
    "- volume: approximate monthly Google searches for this topic in that country (integer).",
    "- difficulty: keyword ranking difficulty 0–100 (higher = harder).",
    "- cpc: approximate cost-per-click in USD (number).",
    "- rankChance: realistic % chance (0–100) that a growing niche site (factonia.in) could reach Google page 1 for this topic in that country within a few months.",
    "- estVisitors: realistic monthly organic visitors that site could win from this topic if it ranks (integer).",
    "",
    "Then pick nothing yourself — just return data for every country. Also return:",
    "- keywords: 10–12 related long-tail keywords worth targeting.",
    "- questions: 6–8 real questions people actually search/ask about this topic.",
  ].join("\n");

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "market_research",
            description: "Return per-country search-demand estimates plus keywords and questions.",
            parameters: {
              type: "object",
              properties: {
                countries: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      code: { type: "string", description: "Country database code, e.g. in, us, uk." },
                      volume: { type: "number" },
                      difficulty: { type: "number" },
                      cpc: { type: "number" },
                      rankChance: { type: "number" },
                      estVisitors: { type: "number" },
                    },
                    required: ["code", "volume", "difficulty", "cpc", "rankChance", "estVisitors"],
                  },
                },
                keywords: { type: "array", items: { type: "string" } },
                questions: { type: "array", items: { type: "string" } },
              },
              required: ["countries", "keywords", "questions"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "market_research" } },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("AI is rate limited right now — please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits are exhausted — add credits in your workspace settings.");
    throw new Error(`AI research failed (${res.status}). Please try again.`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { countries: [], keywords: [], questions: [] };

  const parsed = JSON.parse(args) as {
    countries?: {
      code?: string;
      volume?: number;
      difficulty?: number;
      cpc?: number;
      rankChance?: number;
      estVisitors?: number;
    }[];
    keywords?: string[];
    questions?: string[];
  };

  const insights: CountryInsight[] = (parsed.countries ?? [])
    .map((c) => {
      const code = String(c.code ?? "").toLowerCase();
      if (!code) return null;
      const volume = Math.max(0, Math.round(Number(c.volume) || 0));
      const difficulty = Math.min(100, Math.max(0, Math.round(Number(c.difficulty) || 0)));
      const rankChance = Math.min(100, Math.max(0, Math.round(Number(c.rankChance) || 0)));
      const estVisitors = Math.max(0, Math.round(Number(c.estVisitors) || 0));
      const ease = Math.max(0, 100 - difficulty) / 100;
      return {
        code,
        country: COUNTRY_LABELS[code] ?? code.toUpperCase(),
        volume,
        difficulty,
        cpc: Math.max(0, Number(c.cpc) || 0),
        rankChance,
        estVisitors,
        // Weight opportunity by both search demand and realistic reach.
        score: Math.round(volume * ease * (rankChance / 100) + estVisitors),
      } as CountryInsight;
    })
    .filter((x): x is CountryInsight => x !== null);

  insights.sort((a, b) => b.score - a.score || b.estVisitors - a.estVisitors);

  const keywords = (parsed.keywords ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 12);
  const questions = (parsed.questions ?? []).map((q) => String(q).trim()).filter(Boolean).slice(0, 8);
  return { countries: insights, keywords, questions };
}



async function generateArticle(
  topic: string,
  lovableKey: string,
  best: CountryInsight | null,
  keywords: string[],
  questions: string[],
): Promise<GenerateResult["draft"]> {
  const marketContext = best
    ? `Primary target market: ${best.country}. Estimated monthly searches: ${best.volume.toLocaleString()}. Ranking difficulty: ${best.difficulty}/100. Realistic ranking chance for this site: ${best.rankChance}%. Potential monthly visitors: ~${best.estVisitors.toLocaleString()}. Write with a light lean toward ${best.country} readers (spelling, examples, context) while staying globally useful.`
    : "Target a broad global English-speaking audience.";
  const kw = keywords.length ? `Related keywords to weave in naturally: ${keywords.join(", ")}.` : "";
  const q = questions.length
    ? `Real questions people ask (answer these across the article and reuse the strongest ones as FAQs): ${questions.join(" | ")}.`
    : "";

  const system = [
    "You are a world-class SEO, AEO (Answer Engine Optimisation) and GEO (Generative Engine Optimisation) content strategist and writer.",
    "You write content that ranks on Google/Bing AND gets cited by AI answer engines (ChatGPT, Gemini, Perplexity, Claude).",
    "ALWAYS write in clear, natural English regardless of the topic's language.",
    "Content must be original, factually accurate, up to date, well-structured and genuinely helpful — the kind of authoritative page that earns visitors and citations.",
  ].join(" ");

  const user = [
    `Write a complete, publish-ready blog article about: "${topic}".`,
    marketContext,
    kw,
    q,
    "",
    "Requirements:",
    "- Start the article body with a concise 40–60 word direct-answer paragraph (AEO snippet) that answers the core question immediately.",
    "- 1200–1800 words, organised with semantic HTML: <h2>/<h3> headings, <p>, <ul>/<ol>, <strong>, <blockquote>, and <table> where useful.",
    "- When comparing options, specs, pros/cons or data, use a well-formed HTML table: <table> with a <thead> header row (<th>) and a <tbody> of <tr>/<td>. Keep tables simple (2–5 columns) so they read well on mobile.",
    "- Do NOT include an <h1> (the title is rendered separately). Do NOT include <html>, <head> or <body> tags.",
    "- Use the focus keyword naturally in the first paragraph, at least one H2, and the conclusion — never keyword-stuff.",
    "- Include a short key-takeaways list and a concluding section.",
    "- Provide exactly 5 FAQs (real questions people ask), each with a 2–4 sentence answer, for FAQ schema.",
    "- meta_title <= 60 chars, meta_description <= 160 chars, compelling and keyword-rich.",
    "- image_alt: descriptive alt text for the article's featured image.",
    "- tags: 4–6 concise topical tags. category: one broad category (e.g. Technology, Science, Business, Finance, Health).",
    "- slug: short, lowercase, hyphenated.",
  ].join("\n");

  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_post",
            description: "Return the fully written, SEO/AEO-optimised blog post.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                slug: { type: "string" },
                excerpt: { type: "string", description: "1–2 sentence summary used in cards and the AEO answer box." },
                content: { type: "string", description: "Full article body as semantic HTML (no h1)." },
                meta_title: { type: "string" },
                meta_description: { type: "string" },
                focus_keyword: { type: "string" },
                og_title: { type: "string" },
                og_description: { type: "string" },
                image_alt: { type: "string" },
                faq: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { question: { type: "string" }, answer: { type: "string" } },
                    required: ["question", "answer"],
                  },
                },
                tags: { type: "array", items: { type: "string" } },
                category: { type: "string" },
              },
              required: [
                "title",
                "slug",
                "excerpt",
                "content",
                "meta_title",
                "meta_description",
                "focus_keyword",
                "og_title",
                "og_description",
                "image_alt",
                "faq",
                "tags",
                "category",
              ],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_post" } },
    }),
  });

  if (res.status === 429) throw new Error("AI is rate limited right now — please try again in a minute.");
  if (res.status === 402) throw new Error("AI credits are exhausted — add credits in your workspace settings.");
  if (!res.ok) throw new Error(`AI generation failed (${res.status}). Please try again.`);

  const json = (await res.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[]; content?: string } }[];
  };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("The AI did not return a structured post. Please try again.");

  const parsed = JSON.parse(args) as Record<string, unknown>;
  const faq = Array.isArray(parsed.faq)
    ? (parsed.faq as { question?: string; answer?: string }[])
        .map((f) => ({ question: String(f.question ?? "").trim(), answer: String(f.answer ?? "").trim() }))
        .filter((f) => f.question && f.answer)
    : [];
  const content = String(parsed.content ?? "");
  const words = content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  return {
    title: String(parsed.title ?? topic).trim(),
    slug: slugifyServer(String(parsed.slug || parsed.title || topic)),
    excerpt: String(parsed.excerpt ?? "").trim(),
    content,
    meta_title: String(parsed.meta_title ?? "").trim().slice(0, 60),
    meta_description: String(parsed.meta_description ?? "").trim().slice(0, 160),
    focus_keyword: String(parsed.focus_keyword ?? "").trim(),
    og_title: String(parsed.og_title ?? parsed.title ?? "").trim(),
    og_description: String(parsed.og_description ?? parsed.excerpt ?? "").trim(),
    image_alt: String(parsed.image_alt ?? "").trim(),
    reading_time: Math.max(1, Math.round(words / 200)),
    faq_json: faq,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6) : [],
    category: String(parsed.category ?? "").trim(),
  };
}

export const generatePost = createServerFn({ method: "POST" })
  .inputValidator((data: GenerateInput) => {
    const topic = (data?.topic ?? "").toString().trim();
    if (!topic) throw new Error("Topic is required.");
    if (topic.length > 200) throw new Error("Topic is too long.");
    const countries = Array.isArray(data?.countries) ? data.countries.map((c) => String(c).toLowerCase()).slice(0, 12) : [];
    const accessToken = (data?.accessToken ?? "").toString();
    if (!accessToken) throw new Error("You must be signed in.");
    return { topic, countries, accessToken };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("AI is not configured (missing LOVABLE_API_KEY).");

    // --- Authorise: must be a signed-in admin on the project's Supabase ---
    const { SUPABASE_URL: supabaseUrl, SUPABASE_ANON_KEY: anonKey } = await import(
      "@/lib/supabase-config"
    );
    if (!supabaseUrl || !anonKey) throw new Error("Backend is not configured.");
    const sb = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await sb.auth.getUser(data.accessToken);
    if (userErr || !userData.user) throw new Error("Your session has expired — please sign in again.");
    const { data: isAdmin, error: roleErr } = await sb.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    } as never);
    if (roleErr || !isAdmin) throw new Error("Only admins can generate posts.");

    // --- Market research: Semrush if connected, else AI research (always runs) ---
    const semrushKey = process.env.SEMRUSH_API_KEY;
    let countries: CountryInsight[] = [];
    let keywords: string[] = [];
    let questions: string[] = [];
    let dataSource: "semrush" | "ai" | "none" = "none";
    let semrushError: string | null = null;

    // 1) Try Semrush (real data) when the connector is available.
    if (semrushKey && data.countries.length) {
      try {
        const out = await runSemrush(data.topic, data.countries, lovableKey, semrushKey);
        if (out.countries.length > 0) {
          countries = out.countries;
          keywords = out.keywords;
          dataSource = "semrush";
        }
        semrushError = out.error;
      } catch {
        /* fall through to AI research */
      }
    }

    // 2) Fallback to AI research whenever Semrush produced nothing. This always
    //    gives per-country demand, ranking chance and visitor estimates + keywords.
    if (dataSource !== "semrush") {
      try {
        const ai = await runAiResearch(data.topic, data.countries, lovableKey);
        if (ai.countries.length > 0) {
          countries = ai.countries;
          dataSource = "ai";
        }
        // Keep AI keywords/questions even if country estimates were sparse.
        if (ai.keywords.length) keywords = ai.keywords;
        questions = ai.questions;
      } catch {
        /* research is best-effort — the article is still written below */
      }
    }

    const best = countries[0] ?? null;
    const semrushUsed = dataSource === "semrush";

    // --- AI article generation (SEO + AEO + GEO, fully auto-filled) ---
    const draft = await generateArticle(data.topic, lovableKey, best, keywords, questions);
    if (!draft.focus_keyword) draft.focus_keyword = data.topic;

    const note =
      dataSource === "semrush"
        ? `Semrush analysed ${countries.length} market(s). Best opportunity: ${best?.country} — ~${best?.volume?.toLocaleString()} searches/mo, difficulty ${best?.difficulty}/100, ~${best?.estVisitors?.toLocaleString()} potential visitors/mo.`
        : dataSource === "ai"
          ? `AI researched ${countries.length} market(s) across your target countries. Best opportunity: ${best?.country} — ~${best?.volume?.toLocaleString()} est. searches/mo, ${best?.rankChance}% ranking chance, ~${best?.estVisitors?.toLocaleString()} potential visitors/mo. These are AI estimates, not measured data.`
          : semrushError
            ? `${semrushError} The article was still written from AI research.`
            : "The article was written from AI research.";

    return {
      analysis: {
        dataSource,
        semrushUsed,
        bestCountry: best?.country ?? null,
        bestCountryCode: best?.code ?? null,
        countries,
        keywords,
        questions,
        note,
      },
      draft,
    };
  });
