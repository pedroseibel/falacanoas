import { useCallback, useSyncExternalStore } from "react";

/** The time, ticking every `ms`: a clock as external state, no effect. Server snapshot: 0. */
export function useNow(ms = 1000): number {
  const subscribe = useCallback(
    (tick: () => void) => {
      const id = setInterval(tick, ms);
      return () => clearInterval(id);
    },
    [ms],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / ms) * ms,
    () => 0,
  );
}
