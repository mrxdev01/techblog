import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useRealtimeBlog } from "@/lib/queries";

/** Public site shell with header, footer and realtime subscriptions. */
export function SiteLayout({ children }: { children: ReactNode }) {
  useRealtimeBlog();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
