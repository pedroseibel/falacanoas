import { useSyncExternalStore } from "react";

/** Passkeys need WebAuthn. Read on the client only, so the server render and the first client render agree. */
export const usePasskeySupport = () =>
  useSyncExternalStore(
    () => () => undefined,
    () => typeof window.PublicKeyCredential === "function",
    () => false,
  );
