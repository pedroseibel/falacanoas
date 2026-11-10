import { db } from "./db/client";
import { escalateKnownMatches, recordScreens, screenBytes, type ScreenRow, triagem } from "./known-material";

/**
 * The app's side of the screening service (apps/triagem; DECISIONS round 20; BUILD 5.8). After a photo
 * is stored, its bytes go to the service, in São Paulo, never to a vendor. What comes back sorts the
 * moderator's queue (nudity, faces, plates) and says whether the photo matches known abuse material:
 * the service asks Arachnid Shield with the photo's fingerprint only. Until that verdict is in, nobody
 * sees the photo (known-material.ts); a `csam` match is escalated at once. Without TRIAGEM_URL
 * (development without the service running), nothing is screened; production then keeps new photos
 * out of sight, since it requires the check.
 */

/** What moderators see of a screening: it sorts the queue and says where to look. */
export interface PhotoScreen {
  nudity: number;
  faces: number;
  plates: number;
}

/** Runs in the background, after the response. */
export async function screenStored(photos: { key: string; bytes: Uint8Array<ArrayBuffer> }[]): Promise<void> {
  const service = triagem();
  if (!service || !photos.length) return;
  const results = await Promise.all(photos.map((p) => screenBytes(p.bytes, p.key, service).catch(() => null)));
  const rows = results.flatMap((r): ScreenRow[] => (r ? [r] : []));
  const now = new Date();
  await recordScreens(db, rows, now);
  // The photo's row may not be committed yet (screening runs beside the report); the retry job catches up.
  if (rows.some((r) => r.known === "csam")) await escalateKnownMatches(db, now);
}
