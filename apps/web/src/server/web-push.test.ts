import { describe, expect, test } from "bun:test";
import { base64url } from "@fala/core";
import { encryptPayload, fromBase64Url, vapidAuthorization } from "./web-push";

/** RFC 8291, Appendix A: the worked example. */
const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

async function importEcdhPrivate(d: string, publicRaw: Uint8Array) {
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d,
    x: base64url(publicRaw.subarray(1, 33)),
    y: base64url(publicRaw.subarray(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
}

describe("encryptPayload", () => {
  test("matches RFC 8291's worked example byte for byte", async () => {
    const asPublic = fromBase64Url(RFC.asPublic);
    const body = await encryptPayload(
      new TextEncoder().encode(RFC.plaintext),
      { p256dh: RFC.uaPublic, auth: RFC.auth },
      {
        salt: fromBase64Url(RFC.salt),
        sender: { privateKey: await importEcdhPrivate(RFC.asPrivate, asPublic), publicRaw: asPublic },
      },
    );
    expect(base64url(body)).toBe(RFC.body);
  });

  test("a fresh salt and sender key every time", async () => {
    const to = { p256dh: RFC.uaPublic, auth: RFC.auth };
    const a = await encryptPayload(new TextEncoder().encode("oi"), to);
    const b = await encryptPayload(new TextEncoder().encode("oi"), to);
    expect(base64url(a)).not.toBe(base64url(b));
    // Header: 16-byte salt, record size 4096, a 65-byte key.
    expect(new DataView(a.buffer).getUint32(16)).toBe(4096);
    expect(a[20]).toBe(65);
  });
});

test("vapidAuthorization: an ES256 token for the push service's origin, verifiable with the public key", async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const vapid = {
    privateJwk: JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey)),
    publicKey: base64url(publicRaw),
    subject: "mailto:contato@falacanoas.com.br",
  };
  const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", vapid, 1_800_000_000_000);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
  expect(m?.[4]).toBe(vapid.publicKey);
  const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(m?.[2] ?? "")));
  expect(claims).toEqual({ aud: "https://fcm.googleapis.com", exp: 1_800_000_000 + 43_200, sub: vapid.subject });
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    pair.publicKey,
    fromBase64Url(m?.[3] ?? ""),
    new TextEncoder().encode(`${m?.[1]}.${m?.[2]}`),
  );
  expect(ok).toBeTrue();
});
