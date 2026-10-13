/** The Worker bindings the app uses (wrangler.jsonc). */
declare module "cloudflare:workers" {
  export const env: {
    /** The identity vault (apps/vault), through a service binding. */
    VAULT?: {
      fetch(request: Request): Promise<Response>;
      /** An account signed in: counts against the 180-day rule, and is recorded as access evidence. */
      signedIn(accountId: string, connection: import("@fala/core").Connection): Promise<void>;
      /** A code to the account's own number, before closing it or changing it. */
      reauthCode(
        accountId: string,
      ): Promise<
        { ok: true; hint: string; devCode: string | null } | { ok: false; error: "unlinked" | "rate" | "send" }
      >;
      /** Closes the account in the vault (its number unlinked) once the code checks out. */
      close(
        accountId: string,
        code: string,
        connection: import("@fala/core").Connection,
      ): Promise<{ ok: true } | { ok: false; error: "invalid" }>;
      /** A Turnstile token (a guest pin's by default), checked by the vault (it holds the secret). */
      human(token: string, ip: string | null, action?: string): Promise<boolean>;
      /** Write-only access evidence for a publication, confirmation, comment or guest pin. */
      record(input: {
        action: import("@fala/core").EvidenceAction;
        accountId: string | null;
        itemId: string | null;
        connection: import("@fala/core").Connection;
      }): Promise<void>;
    };
  };
}
