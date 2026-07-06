import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Pass-through layout so /$region/blog search params never leak onto articles. */
export const Route = createFileRoute("/$region/blog")({
  component: () => <Outlet />,
});
