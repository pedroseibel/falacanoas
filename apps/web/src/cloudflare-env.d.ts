/** The Worker bindings the app uses (wrangler.jsonc). */
declare module "cloudflare:workers" {
  export const env: {
    /** The identity vault (apps/vault), through a service binding. */
    VAULT?: {
      fetch(request: Request): Promise<Response>;
      /** An account signed in: counts against the 180-day rule, and is recorded as access evidence. */
      signedIn(accountId: string, connection: import("@fala/core").Connection): Promise<void>;
      /** A guest pin's Turnstile token, checked by the vault (it holds the secret). */
      human(token: string, ip: string | null): Promise<boolean>;
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
