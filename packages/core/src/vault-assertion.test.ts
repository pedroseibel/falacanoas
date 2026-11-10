import { describe, expect, test } from "bun:test";
import {
  importVaultKey,
  readVaultAssertion,
  signVaultAssertion,
  VAULT_AUDIENCE,
  type VaultAssertion,
  WHATSAPP_AUDIENCE,
} from "./vault-assertion";

async function keys() {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const jwk = JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey));
  const { d: _d, ...pub } = JSON.parse(jwk);
  return { sign: await importVaultKey(jwk, "sign"), verify: await importVaultKey(JSON.stringify(pub), "verify") };
}

const now = 1_791_800_000;
const assertion: VaultAssertion = {
  aud: VAULT_AUDIENCE,
  sub: "6f0c2b8e-3a4d-4f6b-9c1e-2d3a4b5c6d7e",
  created: true,
  phoneVerifiedAt: "2026-10-12T22:00:00.000Z",
  hint: "(51) 9…4567",
  iat: now,
  exp: now + 120,
  jti: "0b1c2d3e-4f50-4617-8293-a4b5c6d7e8f9",
};

describe("vault assertion", () => {
  test("round-trips under the vault's key", async () => {
    const k = await keys();
    const token = await signVaultAssertion(assertion, k.sign);
    expect(await readVaultAssertion(token, k.verify, now + 10)).toEqual(assertion);
  });

  test("refuses another key, a tampered payload, and an expired one", async () => {
    const k = await keys();
    const other = await keys();
    const token = await signVaultAssertion(assertion, k.sign);
    expect(await readVaultAssertion(token, other.verify, now)).toBeNull();
    const [p, s] = token.split(".");
    const forged = JSON.stringify({ ...assertion, sub: "00000000-0000-4000-8000-000000000000" });
    const forgedPayload = btoa(String.fromCharCode(...new TextEncoder().encode(forged)))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "");
    expect(await readVaultAssertion(`${forgedPayload}.${s}`, k.verify, now)).toBeNull();
    expect(await readVaultAssertion(`${p}.${s}.x`, k.verify, now)).toBeNull();
    expect(await readVaultAssertion(token, k.verify, now + 120)).toBeNull();
  });

  test("each audience is read only where it was meant: a WhatsApp lookup never signs in", async () => {
    const k = await keys();
    const wa = await signVaultAssertion({ ...assertion, aud: WHATSAPP_AUDIENCE, created: false }, k.sign);
    expect(await readVaultAssertion(wa, k.verify, now)).toBeNull();
    expect(await readVaultAssertion(wa, k.verify, now, WHATSAPP_AUDIENCE)).toMatchObject({ aud: WHATSAPP_AUDIENCE });
    const web = await signVaultAssertion(assertion, k.sign);
    expect(await readVaultAssertion(web, k.verify, now, WHATSAPP_AUDIENCE)).toBeNull();
  });

  test("the public half can't sign", async () => {
    const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
    const { d: _d, ...pub } = await crypto.subtle.exportKey("jwk", pair.privateKey);
    await expect(importVaultKey(JSON.stringify(pub), "sign")).rejects.toThrow();
  });
});
