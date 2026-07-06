import { useNavigate } from "@tanstack/react-router";
import { Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRegion } from "@/components/RegionLink";
import { REGIONS, getRegion } from "@/lib/regions";

/**
 * Country/region switcher. Switching just swaps the URL prefix (e.g. /us ->
 * /in) and lands on that region's home. The default "Global" option drops the
 * prefix entirely. Content is identical everywhere — this is for SEO/geo only.
 */
export function RegionSwitcher() {
  const region = useRegion();
  const active = getRegion(region);
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" aria-label="Choose region">
          <Globe className="h-4 w-4" />
          <span className="hidden text-sm font-medium sm:inline">{active ? active.flag : "🌐"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Region</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate({ to: "/" })}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">🌐 Global (English)</span>
          {!region && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {REGIONS.map((r) => (
          <DropdownMenuItem
            key={r.code}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={() => navigate({ to: "/$region" as any, params: { region: r.code } as any })}
            className="flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              {r.flag} {r.label}
            </span>
            {region === r.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
