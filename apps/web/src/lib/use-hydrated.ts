import { useSyncExternalStore } from "react";

/**
 * False on the server and in the first client render, true once React has hydrated. A form whose
 * submit is handled in JavaScript keeps its button disabled until then: on a slow phone, pressing
 * Enter before hydration would submit natively, reload the page and lose what was typed.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
