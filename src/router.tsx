import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { RouteError } from "./components/RouteBoundaries";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data is treated fresh only briefly so navigating between pages
        // pulls the latest content. Cross-tab/realtime sync marks queries
        // stale immediately on any admin change.
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        // When the user switches back to the public tab after publishing in
        // the admin tab, refetch so the new post appears without a refresh.
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Let React Query own freshness so loaders always reflect invalidations.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error, reset }) => <RouteError error={error as Error} reset={reset} />,
  });

  // Dehydrate the QueryClient on the server and hydrate it on the client so
  // data fetched in loaders (ensureQueryData) is available to
  // useSuspenseQuery during hydration. Without this, the client cache is
  // empty on first paint → hydration suspends/mismatches → root error
  // boundary ("This page didn't load").
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
};
