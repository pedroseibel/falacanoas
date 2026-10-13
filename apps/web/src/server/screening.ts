import { db } from "./db/client";
import { photoScreens } from "./db/schema";

/**
 * The app's side of the screening service (apps/triagem; DECISIONS round 20). After a photo is stored,
 * its bytes go to the service, in São Paulo, never to a vendor; what comes back sorts the moderator's
 * queue. It never decides: every photo still waits for a person. Without TRIAGEM_URL (development
 * without the service running, or before it's deployed), nothing is screened and nothing breaks.
 */

export interface PhotoScreen {
  nudity: number;
  faces: number;
  plates: number;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

async function screenOne(
  bytes: Uint8Array<ArrayBuffer>,
  url: string,
  token: string | undefined,
): Promise<PhotoScreen | null> {
  const res = await fetch(`${url.replace(/\/$/, "")}/triagem`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: bytes,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const body: unknown = await res.json();
  if (typeof body !== "object" || body === null) return null;
  const nudity = "nudity" in body ? body.nudity : null;
  const faces = "faces" in body && Array.isArray(body.faces) ? body.faces.length : null;
  const plates = "plates" in body && Array.isArray(body.plates) ? body.plates.length : null;
  return isNumber(nudity) && isNumber(faces) && isNumber(plates) ? { nudity, faces, plates } : null;
}

/** Screens freshly stored photos and records what was seen. Runs in the background, after the response. */
export async function screenStored(photos: { key: string; bytes: Uint8Array<ArrayBuffer> }[]): Promise<void> {
  const url = process.env.TRIAGEM_URL;
  if (!url || !photos.length) return;
  const token = process.env.TRIAGEM_TOKEN;
  const results = await Promise.all(
    photos.map(async (p) => {
      const s = await screenOne(p.bytes, url, token).catch(() => null);
      return s ? { storageKey: p.key, ...s } : null;
    }),
  );
  const rows = results.flatMap((r) => (r ? [r] : []));
  if (rows.length) await db.insert(photoScreens).values(rows).onConflictDoNothing();
}
