import { useSyncExternalStore } from "react";
import { z } from "zod";

export const ThemeSchema = z.enum(["auto", "light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

const KEY = "fc-theme";
const listeners = new Set<() => void>();

/** Storage can be blocked (private windows, site data off): the theme then lasts only for the visit. */
function read(): Theme {
  try {
    const parsed = ThemeSchema.safeParse(localStorage.getItem(KEY));
    return parsed.success ? parsed.data : "auto";
  } catch {
    return "auto";
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    removeEventListener("storage", onChange);
  };
}

/** The stored theme choice as external state: SSR renders "auto", hydration then reads localStorage. */
export const useTheme = () => useSyncExternalStore(subscribe, read, (): Theme => "auto");

export function prefersDark(): boolean {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme ? theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Calls back whenever what `prefersDark` answers may have changed: a theme choice, or the system
 * switching (at sunset, say) while on "auto". Anything that paints outside CSS (the maps' basemaps)
 * follows the page through this. Returns the function that stops it.
 */
export function onDarkChange(listener: () => void): () => void {
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  listeners.add(listener);
  scheme.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    scheme.removeEventListener("change", listener);
  };
}

/** Applies a theme choice: <html data-theme> (see THEME_BOOT in __root) and persistence; listeners hear of it. */
export function setTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Blocked storage: the choice still applies to this page.
  }
  for (const l of listeners) l();
}
