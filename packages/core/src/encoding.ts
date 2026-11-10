/** Bytes as base64url, unpadded: how keys, tokens and signatures travel between the services. */
export const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

/** The bytes of a base64url string; null when it isn't one. */
export function fromBase64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/** Compares two strings without leaking where they differ. */
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether a request's Authorization header carries this bearer token. No token configured: never. */
export const hasBearer = (authorization: string | null | undefined, token: string | null | undefined) =>
  Boolean(token) && sameText((authorization ?? "").replace(/^Bearer /, ""), token ?? "");
