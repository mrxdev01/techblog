import { SiteLayout } from "@/components/layout/SiteLayout";
import { ExploreCta } from "@/components/blog/ExploreCta";
import { Button } from "@/components/ui/button";
import { RLink } from "@/components/RegionLink";
import { SITE } from "@/lib/config";

export function AboutPage() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-14">
        <h1 className="text-4xl font-bold">About {SITE.name}</h1>
        <div className="prose-content mt-6">
          <p>
            {SITE.name} is an independent publication covering technology, product thinking, and the ideas
            shaping what comes next. We publish clear, well-researched, genuinely useful articles — no
            filler, no clickbait.
          </p>
          <h2>What we write about</h2>
          <p>
            Deep dives, practical guides, and thoughtful analysis. Every piece is written to be readable by
            humans and easily understood by the search and answer engines people now rely on.
          </p>
          <h2>Editorial standards</h2>
          <p>
            We value accuracy, clarity, and helpfulness. Articles show published and updated dates, cite
            sources where relevant, and are attributed to real authors.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild><RLink to="/blog">Read the latest</RLink></Button>
          <Button asChild variant="outline"><RLink to="/contact">Get in touch</RLink></Button>
        </div>
        <div className="mt-14">
          <ExploreCta />
        </div>
      </div>
    </SiteLayout>
  );
}
