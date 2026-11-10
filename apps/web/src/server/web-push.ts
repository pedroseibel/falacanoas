import { base64url } from "@fala/core";
/**
 * Web Push, by the standards and nothing else (RFC 8291 message encryption, RFC 8292 VAPID), on
 * WebCrypto, so it runs in a Worker. The browser's push service (Google's, Mozilla's, Apple's) carries
 * the message but can't read it: only the subscribed browser holds the key. Plain functions: the
 * database side is in push-send.ts.
 */

export interface PushSubscriptionKeys {
  endpoint: string;
  /** The browser's P-256 public key, uncompressed, base64url. */
  p256dh: string;
  /** The browser's 16-byte auth secret, base64url. */
  auth: string;
}

export interface Vapid {
  /** ES256 private key, as a JWK string (VAPID_PRIVATE_KEY). */
  privateJwk: string;
  /** The same key's public half, uncompressed, base64url (VAPID_PUBLIC_KEY). */
  publicKey: string;
  /** Who to contact about this sender: "mailto:…". */
  subject: string;
}

const enc = new TextEncoder();

export function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new Uint8Array(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(salt), info: new Uint8Array(info) },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

export interface EcdhPair {
  privateKey: CryptoKey;
  publicRaw: Uint8Array;
}

async function newEcdhPair(): Promise<EcdhPair> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  return {
    privateKey: pair.privateKey,
    publicRaw: new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
  };
}

/** Record size: one record carries the whole message (ours are a few hundred bytes). */
const RECORD_SIZE = 4096;

/**
 * The message body, encrypted for one browser (RFC 8291, "aes128gcm"): salt, record size, the
 * sender's one-time public key, then the ciphertext. `salt` and `sender` are for the RFC's test
 * vector; left out, they are fresh for every message.
 */
export async function encryptPayload(
  payload: Uint8Array,
  to: Pick<PushSubscriptionKeys, "p256dh" | "auth">,
  fixed: { salt?: Uint8Array; sender?: EcdhPair } = {},
): Promise<Uint8Array> {
  const uaPublic = fromBase64Url(to.p256dh);
  const authSecret = fromBase64Url(to.auth);
  const sender = fixed.sender ?? (await newEcdhPair());
  const salt = fixed.salt ?? crypto.getRandomValues(new Uint8Array(16));

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, sender.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, sender.publicRaw);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", new Uint8Array(cek), "AES-GCM", false, ["encrypt"]);
  // The last (and only) record ends with the 0x02 delimiter.
  const plaintext = concat(payload, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonce) }, aes, plaintext),
  );

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = sender.publicRaw.length;
  return concat(header, sender.publicRaw, ciphertext);
}

/** The VAPID Authorization header for an endpoint's push service (RFC 8292), valid 12 hours. */
export async function vapidAuthorization(endpoint: string, vapid: Vapid, now = Date.now()): Promise<string> {
  const header = base64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = base64url(
    enc.encode(
      JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: vapid.subject }),
    ),
  );
  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(vapid.privateJwk),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)),
  );
  return `vapid t=${header}.${claims}.${base64url(signature)}, k=${vapid.publicKey}`;
}

export type PushOutcome = "sent" | "gone" | "failed";

/**
 * Sends one message to one browser. "gone" means the subscription is dead (the person turned
 * notifications off, or the browser dropped it) and should be deleted.
 */
export async function sendPush(
  to: PushSubscriptionKeys,
  message: unknown,
  vapid: Vapid,
  options: { ttl?: number; topic?: string } = {},
): Promise<PushOutcome> {
  const body = await encryptPayload(enc.encode(JSON.stringify(message)), to);
  const headers: Record<string, string> = {
    authorization: await vapidAuthorization(to.endpoint, vapid),
    "content-encoding": "aes128gcm",
    "content-type": "application/octet-stream",
    ttl: String(options.ttl ?? 86_400),
    urgency: "normal",
  };
  // A newer message with the same topic replaces one the browser hasn't received yet.
  if (options.topic) headers.topic = options.topic;
  const res = await fetch(to.endpoint, { method: "POST", headers, body: new Uint8Array(body) }).catch(() => null);
  if (!res) return "failed";
  if (res.status === 404 || res.status === 410) return "gone";
  return res.ok ? "sent" : "failed";
}
