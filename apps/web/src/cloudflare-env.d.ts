/** The Worker bindings the app uses (wrangler.jsonc). */
declare module "cloudflare:workers" {
  export const env: {
    /** The identity vault (apps/vault), through a service binding. */
    VAULT?: {
      fetch(request: Request): Promise<Response>;
      /** An account signed in without the gateway (a passkey): counts against the 180-day rule. */
      signedIn(accountId: string): Promise<void>;
    };
  };
}
