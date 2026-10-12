import { useSyncExternalStore } from "react";

/** Media query as external state: no effect, SSR-safe (server snapshot = false). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => matchMedia(query).matches,
    () => false,
  );
}

export const PHONE_QUERY = "(max-width: 900px)";
