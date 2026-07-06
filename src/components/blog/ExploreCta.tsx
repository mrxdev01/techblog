import { ArrowRight, BookOpen, Compass, Sparkles } from "lucide-react";
import { RLink } from "@/components/RegionLink";
import { SITE } from "@/lib/config";

/**
 * Modern, form-free call-to-action that replaces the old newsletter box.
 * Invites readers to keep exploring instead of asking for an email address.
 */
export function ExploreCta() {
  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-primary p-8 text-primary-foreground shadow-elegant sm:p-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold sm:text-3xl">Keep exploring {SITE.name}</h2>
        <p className="mx-auto mt-2 max-w-md text-primary-foreground/80">
          Clear, well-researched reads across technology, science, and the ideas shaping what comes next.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <RLink
            to="/blog"
            className="group flex items-center gap-3 rounded-xl bg-white/10 p-4 text-left transition hover:bg-white/20"
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            <span className="flex-1">
              <span className="block font-semibold">Latest articles</span>
              <span className="block text-sm text-primary-foreground/70">Fresh explainers & deep dives</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
          </RLink>

          <RLink
            to="/about"
            className="group flex items-center gap-3 rounded-xl bg-white/10 p-4 text-left transition hover:bg-white/20"
          >
            <Compass className="h-5 w-5 shrink-0" />
            <span className="flex-1">
              <span className="block font-semibold">About us</span>
              <span className="block text-sm text-primary-foreground/70">Who we are & what we cover</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
          </RLink>
        </div>
      </div>
    </section>
  );
}
