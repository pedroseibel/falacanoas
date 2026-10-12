import { useSyncExternalStore } from "react";
import { z } from "zod";
import { setMapState } from "@/features/map/map-store";

export const ThemeSchema = z.enum(["auto", "light", "dark"]);
export type Theme = z.infer<typeof ThemeSchema>;

const KEY = "fc-theme";
const listeners = new Set<() => void>();

function read(): Theme {
  const parsed = ThemeSchema.safeParse(localStorage.getItem(KEY));
  return parsed.success ? parsed.data : "auto";
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

/** Applies a theme choice: <html data-theme> (see THEME_BOOT in __root), persistence, and the map basemap. */
export function setTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  localStorage.setItem(KEY, t);
  setMapState({ dark: t === "dark" || (t === "auto" && matchMedia("(prefers-color-scheme: dark)").matches) });
  for (const l of listeners) l();
}
