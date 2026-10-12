import { importVaultKey, readVaultAssertion, type VaultAssertion } from "@fala/core";
import { env } from "cloudflare:workers";

/**
 * The app's side of the identity vault (apps/vault; DECISIONS round 18, Q29). The app never holds a
 * phone number or a vault secret: it verifies the vault's signed assertions with the public key, and
 * may tell the vault that an account signed in. That's all the binding allows.
 */

let verifyKey: Promise<CryptoKey> | null = null;

/** The assertion, if the vault signed it and it hasn't expired; null otherwise. */
export function readAssertion(token: string, now = Date.now()): Promise<VaultAssertion | null> {
  const jwk = process.env.VAULT_VERIFY_KEY;
  if (!jwk) throw new Error("VAULT_VERIFY_KEY não configurada: rode `bun run keys` em apps/vault.");
  verifyKey ??= importVaultKey(jwk, "verify");
  return verifyKey.then((key) => readVaultAssertion(token, key, Math.floor(now / 1000)));
}

/** Best effort: a failed notice must not fail a sign-in. */
export async function noteSignIn(accountId: string): Promise<void> {
  await env.VAULT?.signedIn(accountId).catch((e: unknown) => console.error("cofre: signedIn falhou", e));
}

/**
 * Development only. In production a route sends /api/identidade/* on the instance's domain straight
 * to the vault Worker, so phone numbers never reach the app; here, with one dev server, the app hands
 * the request over untouched.
 */
export async function forwardToVault(request: Request): Promise<Response> {
  if (!import.meta.env.DEV) return new Response("Não encontrado.", { status: 404 });
  if (!env.VAULT) return Response.json({ ok: false, error: "send" }, { status: 503 });
  return env.VAULT.fetch(request);
}
