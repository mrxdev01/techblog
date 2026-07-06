import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isRecoverableLoadError, autoReloadOnce, installPreloadErrorRecovery, nextRecoverDelay } from "../lib/recover";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/CookieConsent";
import { SITE, ANALYTICS, SOCIAL_LINKS } from "@/lib/config";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl font-bold text-gradient">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  // Stale-chunk / dropped-download errors (common on mobile after a new
  // publish): silently reload once instead of showing the error screen.
  const recovering = isRecoverableLoadError(error);

  useEffect(() => {
    if (recovering && autoReloadOnce()) return;
    reportLovableError(error, { boundary: "tanstack_root_error_component" });

    // For any other failure (transient data / hydration blip) never show an
    // error screen — silently re-run and let the skeleton fill in. The backoff
    // keeps this from becoming a hot loop.
    if (recovering) return;
    const delay = nextRecoverDelay();
    const t = setTimeout(() => {
      void router.invalidate();
      reset();
    }, delay);
    return () => clearTimeout(t);
  }, [error, recovering, router, reset]);

  // Full-viewport skeleton — a calm loading state, not a dead end.
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <div className="skeleton-loader h-9 w-56 max-w-full rounded-lg" />
          <div className="skeleton-loader h-4 w-80 max-w-full rounded-lg" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card shadow-card">
              <div className="skeleton-loader aspect-[16/9] w-full" />
              <div className="space-y-3 p-5">
                <div className="skeleton-loader h-4 w-24 rounded-lg" />
                <div className="skeleton-loader h-6 w-full rounded-lg" />
                <div className="skeleton-loader h-6 w-2/3 rounded-lg" />
                <div className="skeleton-loader h-4 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${SITE.name} — Facts, explainers & ideas on tech, science & culture` },
      { name: "description", content: SITE.description },
      { name: "author", content: SITE.name },
      { name: "publisher", content: SITE.name },
      { name: "application-name", content: SITE.name },
      { name: "apple-mobile-web-app-title", content: SITE.name },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "format-detection", content: "telephone=no" },
      {
        name: "keywords",
        content:
          "Factonia, facts, explainers, technology, science, business, culture, how it works, why explained, in-depth articles, knowledge, ideas",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "rating", content: "general" },
      { name: "referrer", content: "origin-when-cross-origin" },
      { name: "theme-color", content: "#7C3AED" },
      { name: "color-scheme", content: "dark light" },
      { property: "og:title", content: `${SITE.name} — Facts, explainers & ideas on tech, science & culture` },
      { property: "og:description", content: SITE.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { property: "og:locale", content: "en_US" },
      ...(SITE.url ? [{ property: "og:url" as const, content: `${SITE.url}/` }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: SITE.twitter },
      { name: "twitter:creator", content: SITE.twitter },
      { name: "twitter:title", content: `${SITE.name} — Facts, explainers & ideas on tech, science & culture` },
      { name: "twitter:description", content: SITE.description },
      ...(ANALYTICS.gscVerification
        ? [{ name: "google-site-verification", content: ANALYTICS.gscVerification }]
        : []),
      // Branded default share image (branded Factonia card). Leaf routes
      // override these via buildSeo() with their own post/category image.
      ...(SITE.url
        ? [
            { property: "og:image" as const, content: `${SITE.url}/og-cover.jpg` },
            { property: "og:image:alt" as const, content: `${SITE.name} — Facts, explainers & ideas` },
            { name: "twitter:image" as const, content: `${SITE.url}/og-cover.jpg` },
            { name: "twitter:image:alt" as const, content: `${SITE.name} — Facts, explainers & ideas` },
          ]
        : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // NOTE: canonical is intentionally NOT set here. TanStack concatenates
      // <link> tags without de-duping, so every leaf route emits its own
      // self-referencing canonical via buildSeo(); a root canonical would add
      // a second, conflicting canonical to every page.
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      // Larger square PNGs (multiples of 48px) — Google prefers these for the
      // favicon shown in search results and skips ones smaller than 48px.
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-192.png" },
      { rel: "icon", type: "image/png", sizes: "96x96", href: "/favicon-96.png" },
      { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16.png" },
      // Legacy shortcut icon for older crawlers/browsers.
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE.name,
          url: SITE.url || undefined,
          description: SITE.description,
          logo: SITE.url ? `${SITE.url}/favicon-512.png` : undefined,
          sameAs: SOCIAL_LINKS,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: SITE.url || undefined,
          description: SITE.description,
          inLanguage: "en",
          ...(SITE.url
            ? {
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${SITE.url}/search?q={search_term_string}`,
                  "query-input": "required name=search_term_string",
                },
              }
            : {}),
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved reading theme before paint to avoid a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
        {/*
          ============================================================
          ANALYTICS & ADS — paste your OWN IDs, then uncomment.
          Get IDs from your own accounts. Never use anyone else's.
          ------------------------------------------------------------
          Google Analytics 4 (VITE_GA_MEASUREMENT_ID):
            <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
            <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-XXXXXXXXXX')</script>

          Google Search Console verification (VITE_GSC_VERIFICATION):
            <meta name="google-site-verification" content="YOUR_TOKEN" />

          Microsoft Clarity (VITE_CLARITY_PROJECT_ID): paste the Clarity snippet here.

          Google AdSense (VITE_ADSENSE_PUBLISHER_ID):
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossOrigin="anonymous"></script>
          ============================================================
        */}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Recover transparently when a route chunk fails to preload (stale deploy
  // or flaky mobile network) instead of surfacing the error screen.
  useEffect(() => {
    installPreloadErrorRecovery();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors position="top-center" />
        <CookieConsent />
      </AuthProvider>
    </QueryClientProvider>
  );
}
