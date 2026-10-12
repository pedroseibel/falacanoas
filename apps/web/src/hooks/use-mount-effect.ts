import { useEffect } from "react";

/** The single sanctioned bridge to imperative systems (MapLibre, subscriptions) on mount. */
export function useMountEffect(effect: () => void | (() => void)) {
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once by design.
  useEffect(effect, []);
}
