import { z } from "zod";

/**
 * What the identity vault tells the app after a phone code checks out (DECISIONS round 18, Q29):
 * which account signs in, never the number. The vault signs it with an Ed25519 key only it holds;
 * the app verifies it with the public half, so a compromised app can read assertions but not mint them.
 * Short-lived and single-use (`jti`).
 */
export const VAULT_AUDIENCE = "fala-web";
/** Seconds an assertion stays valid: long enough to hand over, too short to be worth stealing. */
export const VAULT_ASSERTION_TTL = 120;

export const VaultAssertionSchema = z.object({
  aud: z.literal(VAULT_AUDIENCE),
  /** The account id. The vault owns the phone ↔ account link and mints new ids. */
  sub: z.uuid(),
  /** The account was created by this verification. */
  created: z.boolean(),
  /** When this phone was first verified for this account: confirmations count 72 h after it (Q17). */
  phoneVerifiedAt: z.iso.datetime(),
  /** "(51) 9…4567": enough for the person to recognise their number, not enough to call it. */
  hint: z.string().max(20),
  iat: z.number().int(),
  exp: z.number().int(),
  jti: z.uuid(),
});
export type VaultAssertion = z.infer<typeof VaultAssertionSchema>;

const ED25519 = { name: "Ed25519" };

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

function fromBase64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const KeySchema = z.object({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string(),
  d: z.string().optional(),
});

/** Imports the signing (private) or verifying (public) half from a JWK string, as kept in the environment. */
export async function importVaultKey(jwk: string, use: "sign" | "verify"): Promise<CryptoKey> {
  const parsed = KeySchema.parse(JSON.parse(jwk));
  if (use === "sign" && !parsed.d) throw new Error("A chave de assinatura do cofre precisa da parte privada.");
  const key = use === "sign" ? parsed : { kty: parsed.kty, crv: parsed.crv, x: parsed.x };
  return crypto.subtle.importKey("jwk", key, ED25519, false, [use]);
}

/** `payload.signature`, both base64url. */
export async function signVaultAssertion(a: VaultAssertion, key: CryptoKey): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(VaultAssertionSchema.parse(a)));
  const signature = new Uint8Array(await crypto.subtle.sign(ED25519, key, payload));
  return `${base64url(payload)}.${base64url(signature)}`;
}

/** The assertion, if the signature, audience and expiry hold at `now` (seconds); null otherwise. */
export async function readVaultAssertion(token: string, key: CryptoKey, now: number): Promise<VaultAssertion | null> {
  const [p, s, extra] = token.split(".");
  if (!p || !s || extra !== undefined) return null;
  const payload = fromBase64url(p);
  const signature = fromBase64url(s);
  if (!payload || !signature) return null;
  if (!(await crypto.subtle.verify(ED25519, key, signature, payload))) return null;
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
  const a = VaultAssertionSchema.safeParse(json);
  if (!a.success || a.data.exp <= now || a.data.iat > now + 30) return null;
  return a.data;
}
