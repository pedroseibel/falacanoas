import {
  connectionFromHeaders,
  importVaultKey,
  readVaultAssertion,
  type EvidenceAction,
  type VaultAssertion,
} from "@fala/core";
import { getRequestHeaders } from "@tanstack/react-start/server";
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

/**
 * Every sign-in (code or passkey): the vault resets the account's 180-day clock and records the access
 * evidence (round 18, Q20 and Q21). A failure is logged, never turned into a failed sign-in.
 */
export async function noteSignIn(accountId: string, headers: Headers | null): Promise<void> {
  const connection = connectionFromHeaders(headers ?? new Headers());
  await env.VAULT?.signedIn(accountId, connection).catch((e: unknown) => console.error("cofre: signedIn falhou", e));
}

/** A guest pin's robot check, through the vault, which holds the Turnstile secret. Fails closed. */
export async function isHuman(token: string | null): Promise<boolean> {
  if (!token || !env.VAULT) return false;
  const ip = connectionFromHeaders(new Headers(getRequestHeaders())).clientIp;
  return env.VAULT.human(token, ip).catch(() => false);
}

/**
 * Access evidence for an action this request performed (round 18, Q21): the connection as
 * Cloudflare saw it, kept by the vault for 6 months. Logged on failure, so the person's report still
 * goes through.
 */
export async function recordEvidence(
  action: EvidenceAction,
  accountId: string | null,
  itemId: string | null,
): Promise<void> {
  const connection = connectionFromHeaders(new Headers(getRequestHeaders()));
  await env.VAULT?.record({ action, accountId, itemId, connection }).catch((e: unknown) =>
    console.error(`cofre: evidência de ${action} falhou`, e),
  );
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
