import { SiteLayout } from "@/components/layout/SiteLayout";
import type { ReactNode } from "react";

/** Shared wrapper for legal / long-form static pages. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-bold">{title}</h1>
        {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>}
        <div className="prose-content mt-8">{children}</div>
      </div>
    </SiteLayout>
  );
}
