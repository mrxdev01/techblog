import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for `/blog` and its children (`/blog/$slug`).
 * It only renders an <Outlet /> so search-param validation and pagination
 * defined on the `/blog` index leaf never leak onto article URLs.
 */
export const Route = createFileRoute("/blog")({
  component: () => <Outlet />,
});
