import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { RegionSwitcher } from "@/components/RegionSwitcher";
import { RLink, useRegionNavigate } from "@/components/RegionLink";
import { categoriesQuery } from "@/lib/queries";
import { SITE } from "@/lib/config";
import factoniaLogo from "@/assets/factonia-logo.png";

export function Header() {
  const regionNavigate = useRegionNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: categories = [] } = useQuery(categoriesQuery());

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    regionNavigate("/search", { search: { q: term || undefined } });
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <RLink to="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <img
            src={factoniaLogo}
            alt={`${SITE.name} logo`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
          />
          {SITE.name}
        </RLink>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          <RLink
            to="/blog"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            All Posts
          </RLink>
          {categories.slice(0, 4).map((c) => (
            <RLink
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {c.name}
            </RLink>
          ))}
          <RLink
            to="/about"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </RLink>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={submitSearch} className="hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                aria-label="Search posts"
                className="h-9 w-44 pl-8"
              />
            </div>
          </form>
          <RegionSwitcher />
          <ThemeSwitcher />

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="flex items-center gap-2 font-display">
                <img src={factoniaLogo} alt={`${SITE.name} logo`} width={24} height={24} className="h-6 w-6 rounded-md" /> {SITE.name}
              </SheetTitle>
              <form onSubmit={submitSearch} className="mt-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search…"
                    className="pl-8"
                  />
                </div>
              </form>
              <nav className="mt-6 flex flex-col gap-1">
                <RLink to="/blog" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  All Posts
                </RLink>
                {categories.map((c) => (
                  <RLink
                    key={c.id}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    {c.name}
                  </RLink>
                ))}
                <RLink to="/about" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  About
                </RLink>
                <RLink to="/contact" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                  Contact
                </RLink>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
