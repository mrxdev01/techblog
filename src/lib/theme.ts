export type ThemeId = "charcoal" | "obsidian" | "midnight" | "daylight";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  desc: string;
  /** whether the `dark` class should be applied (drives `dark:` utilities) */
  dark: boolean;
  /** small preview swatch shown in the switcher */
  swatch: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "charcoal",
    label: "Charcoal",
    desc: "Soft dark — easy on the eyes",
    dark: true,
    swatch: "#232326",
  },
  {
    id: "obsidian",
    label: "Obsidian",
    desc: "Deep black — max focus (OLED)",
    dark: true,
    swatch: "#111113",
  },
  {
    id: "midnight",
    label: "Midnight",
    desc: "Calm navy blue — restful",
    dark: true,
    swatch: "#1b2140",
  },
  {
    id: "daylight",
    label: "Daylight",
    desc: "Bright & clean — light mode",
    dark: false,
    swatch: "#fafafa",
  },
];

export const DEFAULT_THEME: ThemeId = "charcoal";
export const STORAGE_KEY = "theme";

const DARK_IDS: ThemeId[] = ["charcoal", "obsidian", "midnight"];

/** Normalize legacy values ("light"/"dark") and unknowns to a valid ThemeId. */
export function normalizeTheme(value: string | null | undefined): ThemeId {
  if (value === "light") return "daylight";
  if (value === "dark") return "charcoal";
  if (value && THEMES.some((t) => t.id === value)) return value as ThemeId;
  return DEFAULT_THEME;
}

export function applyTheme(id: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", id);
  root.classList.toggle("dark", DARK_IDS.includes(id));
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore write errors (private mode, etc.) */
  }
}

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return normalizeTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Inline script that runs before paint to set the theme with no flash.
 * Kept dependency-free and defensive so it never throws during SSR hydration.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m={light:"daylight",dark:"charcoal"};var v=localStorage.getItem("theme");v=m[v]||v;var valid=["charcoal","obsidian","midnight","daylight"];if(valid.indexOf(v)<0){v="charcoal";}var dark=["charcoal","obsidian","midnight"];var el=document.documentElement;el.setAttribute("data-theme",v);el.classList.toggle("dark",dark.indexOf(v)>-1);}catch(e){var el=document.documentElement;el.setAttribute("data-theme","charcoal");el.classList.add("dark");}})();`;
