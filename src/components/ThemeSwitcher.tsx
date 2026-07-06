import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  THEMES,
  DEFAULT_THEME,
  applyTheme,
  getStoredTheme,
  type ThemeId,
} from "@/lib/theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

  function select(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
  }

  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Choose reading theme"
          className="relative"
        >
          <Palette className="h-5 w-5" />
          <span
            className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ring-2 ring-background"
            style={{ backgroundColor: mounted ? active.swatch : "transparent" }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" /> Reading theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-col gap-1 p-1">
          {THEMES.map((t) => {
            const isActive = mounted && t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => select(t.id)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  isActive
                    ? "bg-accent ring-1 ring-primary/40"
                    : "hover:bg-muted",
                )}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-md border border-border shadow-sm"
                  style={{ backgroundColor: t.swatch }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {t.label}
                    {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
