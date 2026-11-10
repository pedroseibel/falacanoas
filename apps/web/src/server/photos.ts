import type { ImageType } from "@fala/core";

/**
 * Report photos in Supabase Storage (São Paulo): the private "fotos" bucket, reached only from the
 * server with the secret key. Photos arrive here already stripped of metadata; the browser reads them
 * through /api/fotos/$key, never from Supabase.
 */

const BUCKET = "fotos";

function storage(path: string): { url: string; headers: Record<string, string> } {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key)
    throw new Error("SUPABASE_URL e SUPABASE_SECRET_KEY não configuradas: veja apps/web/.dev.vars.example.");
  return { url: `${base}/storage/v1/object/${path}`, headers: { apikey: key } };
}

/** Keys are random: a photo's address says nothing about who took it, or where. */
const KEY = /^[0-9a-f-]{36}\.(webp|jpg)$/;
export const isPhotoKey = (key: string) => KEY.test(key);

export async function putPhoto(bytes: Uint8Array<ArrayBuffer>, type: ImageType): Promise<{ key: string; src: string }> {
  const key = `${crypto.randomUUID()}.${type === "image/webp" ? "webp" : "jpg"}`;
  const { url, headers } = storage(`${BUCKET}/${key}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "content-type": type, "cache-control": "31536000", "x-upsert": "false" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage recusou a foto (${res.status}).`);
  return { key, src: `/api/fotos/${key}` };
}

/**
 * Deletes stored photos and says whether Storage did it. Never throws: after a report that failed to
 * save it is best effort; the retention job reads the answer, so it only records what really went.
 */
export async function removePhotos(keys: string[]): Promise<boolean> {
  if (!keys.length) return true;
  const { url, headers } = storage(BUCKET);
  return fetch(url, {
    method: "DELETE",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefixes: keys }),
  }).then(
    (res) => res.ok,
    () => false,
  );
}

export async function getPhoto(key: string): Promise<Response | null> {
  if (!isPhotoKey(key)) return null;
  const { url, headers } = storage(`authenticated/${BUCKET}/${key}`);
  const res = await fetch(url, { headers });
  return res.ok ? res : null;
}
