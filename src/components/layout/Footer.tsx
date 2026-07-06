import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RLink } from "@/components/RegionLink";
import { SITE } from "@/lib/config";
import factoniaLogo from "@/assets/factonia-logo.png";

export function Footer() {
  // Compute the year on the client after mount to avoid SSR/client
  // hydration mismatches (the server runtime clock can differ).
  const [year, setYear] = useState<number | null>(null);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <footer className="mt-20 border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">

          <RLink to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <img
              src={factoniaLogo}
              alt={`${SITE.name} logo`}
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg"
            />
            {SITE.name}
          </RLink>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">{SITE.description}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><RLink to="/blog" className="hover:text-foreground">All Posts</RLink></li>
            <li><RLink to="/search" search={{ q: undefined }} className="hover:text-foreground">Search</RLink></li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/disclaimer" className="hover:text-foreground">Disclaimer</Link></li>
          </ul>
        </div>

      </div>

      <div className="border-t py-6">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground" suppressHydrationWarning>
          © {year ?? ""} {SITE.name}. All rights reserved.
        </p>

      </div>
    </footer>
  );
}
