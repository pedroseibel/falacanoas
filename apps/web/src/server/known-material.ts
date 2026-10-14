import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./db/client";
import { escalations, itemPhotos, moderationCases, photoScreens } from "./db/schema";
import { escalateCase, heldItem, openCase, type CaseRow } from "./moderation-store";
import { getPhoto } from "./photos";

/**
 * Known child abuse material (BUILD 5.8; research/legal/hash-matching.md). The screening service in
 * São Paulo fingerprints every new photo (PDQ) and asks Arachnid Shield with the fingerprint only.
 * Until the answer is in, nobody sees the photo: not the moderation queue, not the photo route. A
 * `csam` match is escalated at once, with no one having seen it; a match of another class waits for
 * the designated person, who decides from the match record (`escalation conferir`), never the image.
 * Server-only: browser code never imports this module.
 */

type Q = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Shield's answers that let a person see the photo. "unhashable": too flat to fingerprint (PDQ < 50). */
const CLEARED = new Set(["no-known-match", "unhashable"]);

/**
 * Whether new photos must pass the check before anyone sees them. HASH_MATCHING=required|off; unset,
 * production requires it (a launch condition) and development doesn't, so a dev server without the
 * screening service still shows photos.
 */
export function hashMatchingRequired(env: Record<string, string | undefined> = process.env): boolean {
  if (env.HASH_MATCHING === "required") return true;
  if (env.HASH_MATCHING === "off") return false;
  return !import.meta.env.DEV;
}

export interface KnownScreen {
  known: string | null;
  knownReview: string | null;
}

/** The check passed, or the designated person released the photo after a match that wasn't plainly abuse. */
export const isCleared = (s: KnownScreen | null | undefined) =>
  Boolean(s && ((s.known !== null && CLEARED.has(s.known)) || s.knownReview === "released"));

/**
 * Whether a moderator may see a photo now. Approved photos are public already (including those from
 * before the check existed); anything else (pending, or removed, say by refusing a held pin before its
 * check came in) needs the check when it's required.
 */
export const visibleToModerators = (review: string, screen: KnownScreen | null | undefined, required: boolean) =>
  review === "approved" || !required || isCleared(screen);

/** What the screening service answered about one photo, as the app stores it. */
export interface ScreenRow {
  storageKey: string;
  nudity: number;
  faces: number;
  plates: number;
  pdq: string | null;
  pdqQuality: number | null;
  known: string | null;
  knownMatch: string | null;
  knownDbVersion: string | null;
}

/**
 * Keeps each screening. A repeat (the retry job) refreshes the counts but never erases a verdict
 * already in: a failed re-check leaves the earlier answer.
 */
export async function recordScreens(q: Db, rows: ScreenRow[], now: Date): Promise<void> {
  if (!rows.length) return;
  await q
    .insert(photoScreens)
    .values(rows.map((r) => ({ ...r, knownCheckedAt: r.known ? now : null })))
    .onConflictDoUpdate({
      target: photoScreens.storageKey,
      set: {
        nudity: sql`excluded.nudity`,
        faces: sql`excluded.faces`,
        plates: sql`excluded.plates`,
        pdq: sql`coalesce(excluded.pdq, ${photoScreens.pdq})`,
        pdqQuality: sql`coalesce(excluded.pdq_quality, ${photoScreens.pdqQuality})`,
        known: sql`coalesce(${photoScreens.known}, excluded.known)`,
        knownMatch: sql`case when ${photoScreens.known} is null then excluded.known_match else ${photoScreens.knownMatch} end`,
        knownDbVersion: sql`case when ${photoScreens.known} is null then excluded.known_db_version else ${photoScreens.knownDbVersion} end`,
        knownCheckedAt: sql`case when ${photoScreens.known} is null then excluded.known_checked_at else ${photoScreens.knownCheckedAt} end`,
      },
    });
}

/**
 * Escalates every match still waiting: `csam` verdicts, and matches the designated person confirmed
 * ("escalated"). Each in its own transaction, on the photo's open case (or a new one). Returns how
 * many were escalated. Safe to run repeatedly: an escalated photo is skipped.
 */
export async function escalateKnownMatches(q: Db, now: Date): Promise<number> {
  const due = await q
    .select({
      photoId: itemPhotos.id,
      itemId: itemPhotos.itemId,
      known: photoScreens.known,
      knownMatch: photoScreens.knownMatch,
    })
    .from(photoScreens)
    .innerJoin(itemPhotos, eq(itemPhotos.storageKey, photoScreens.storageKey))
    .leftJoin(escalations, eq(escalations.photoId, itemPhotos.id))
    .where(and(isNull(escalations.id), or(eq(photoScreens.known, "csam"), eq(photoScreens.knownReview, "escalated"))));
  let n = 0;
  for (const p of due) {
    // oxlint-disable-next-line no-await-in-loop
    const done = await q.transaction(async (tx) => {
      let [c] = await tx
        .select()
        .from(moderationCases)
        .where(and(eq(moderationCases.photoId, p.photoId), eq(moderationCases.status, "open")))
        .limit(1)
        .for("update");
      if (!c) {
        const id = await openCase(tx, p.itemId, "takedown", [], { photoId: p.photoId });
        [c] = await tx.select().from(moderationCases).where(eq(moderationCases.id, id));
      }
      if (!c) return false;
      return (
        (await escalateCase(
          tx,
          c,
          { userId: null, source: "hash_match", matchClass: p.known, matchType: p.knownMatch },
          now,
        )) === "escalated"
      );
    });
    if (done) n++;
  }
  return n;
}

/** Calls the screening service for one photo and reads its answer; null when it can't. */
export async function screenBytes(
  bytes: Uint8Array<ArrayBuffer>,
  key: string,
  env: { url: string; token?: string },
): Promise<ScreenRow | null> {
  const res = await fetch(`${env.url.replace(/\/$/, "")}/triagem`, {
    method: "POST",
    headers: {
      "content-type": "application/octet-stream",
      ...(env.token ? { authorization: `Bearer ${env.token}` } : {}),
    },
    body: bytes,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  return readScreen(key, await res.json());
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const KNOWN = new Set(["no-known-match", "csam", "harmful-abusive-material", "test", "unhashable"]);

/** The service's JSON, checked field by field (apps/triagem's TriagemResult). */
export function readScreen(storageKey: string, body: unknown): ScreenRow | null {
  if (typeof body !== "object" || body === null) return null;
  const nudity = "nudity" in body ? body.nudity : null;
  const faces = "faces" in body && Array.isArray(body.faces) ? body.faces.length : null;
  const plates = "plates" in body && Array.isArray(body.plates) ? body.plates.length : null;
  if (!isNumber(nudity) || !isNumber(faces) || !isNumber(plates)) return null;
  const print = "pdq" in body && typeof body.pdq === "object" && body.pdq !== null ? body.pdq : null;
  const hex = print && "hex" in print && typeof print.hex === "string" ? print.hex : null;
  const quality = print && "quality" in print && isNumber(print.quality) ? print.quality : null;
  const known = "known" in body && typeof body.known === "object" && body.known !== null ? body.known : null;
  const classification =
    known && "classification" in known && typeof known.classification === "string" && KNOWN.has(known.classification)
      ? known.classification
      : null;
  const match =
    known && "matchType" in known && (known.matchType === "exact" || known.matchType === "near")
      ? known.matchType
      : null;
  const version =
    known && "databaseVersion" in known && typeof known.databaseVersion === "string" ? known.databaseVersion : null;
  return {
    storageKey,
    nudity,
    faces,
    plates,
    pdq: hex,
    pdqQuality: quality,
    known: classification,
    knownMatch: classification ? match : null,
    knownDbVersion: classification ? version : null,
  };
}

/**
 * The retry (every 10 minutes): pending photos from the last week with no verdict yet, screened again
 * from Storage; then any match escalated. Without TRIAGEM_URL there is nothing to retry with.
 */
export async function recheckPending(
  q: Db,
  now: Date,
  env = process.env,
): Promise<{ checked: number; escalated: number }> {
  const url = env.TRIAGEM_URL;
  if (!url) return { checked: 0, escalated: await escalateKnownMatches(q, now) };
  const waiting = await q
    .select({ key: itemPhotos.storageKey })
    .from(itemPhotos)
    .leftJoin(photoScreens, eq(photoScreens.storageKey, itemPhotos.storageKey))
    .where(
      and(
        eq(itemPhotos.review, "pending"),
        isNull(itemPhotos.purgedAt),
        gt(itemPhotos.takenAt, new Date(now.getTime() - 7 * 86_400_000)),
        isNull(photoScreens.known),
      ),
    )
    .orderBy(asc(itemPhotos.takenAt))
    .limit(25);
  const rows: ScreenRow[] = [];
  for (const { key } of waiting) {
    if (!key) continue;
    // oxlint-disable-next-line no-await-in-loop
    const photo = await getPhoto(key).catch(() => null);
    if (!photo) continue;
    // oxlint-disable-next-line no-await-in-loop
    const bytes = new Uint8Array(await photo.arrayBuffer());
    // oxlint-disable-next-line no-await-in-loop
    const row = await screenBytes(bytes, key, { url, token: env.TRIAGEM_TOKEN }).catch(() => null);
    if (row) rows.push(row);
  }
  await recordScreens(q, rows, now);
  return { checked: rows.length, escalated: await escalateKnownMatches(q, now) };
}

/** Pending photos still out of sight for want of a verdict: how many, and how long the oldest has waited. */
export async function awaitingCheck(q: Db, now: Date): Promise<{ count: number; oldestMinutes: number }> {
  const rows = await q
    .select({ takenAt: itemPhotos.takenAt })
    .from(itemPhotos)
    .leftJoin(photoScreens, eq(photoScreens.storageKey, itemPhotos.storageKey))
    .where(and(eq(itemPhotos.review, "pending"), isNull(itemPhotos.purgedAt), isNull(photoScreens.known)))
    .orderBy(asc(itemPhotos.takenAt));
  const oldest = rows[0]?.takenAt;
  return { count: rows.length, oldestMinutes: oldest ? Math.floor((now.getTime() - oldest.getTime()) / 60_000) : 0 };
}

/** The verdicts for some storage keys, for the queue's filter. */
export async function screensFor(q: Db, keys: string[]): Promise<Map<string, KnownScreen>> {
  if (!keys.length) return new Map();
  const rows = await q
    .select({ key: photoScreens.storageKey, known: photoScreens.known, knownReview: photoScreens.knownReview })
    .from(photoScreens)
    .where(inArray(photoScreens.storageKey, keys));
  return new Map(rows.map((r) => [r.key, { known: r.known, knownReview: r.knownReview }]));
}

/**
 * Whether a decision may publish what a case covers: its photo, or for a held pin every pending photo
 * it would publish with it. Refusing stays possible either way (a refusal exposes nothing).
 */
export async function caseCleared(
  q: Q,
  c: Pick<CaseRow, "itemId" | "photoId" | "eventId" | "reason">,
): Promise<boolean> {
  if (!hashMatchingRequired()) return true;
  const rows = await q
    .select({ review: itemPhotos.review, known: photoScreens.known, knownReview: photoScreens.knownReview })
    .from(itemPhotos)
    .leftJoin(photoScreens, eq(photoScreens.storageKey, itemPhotos.storageKey))
    .where(
      c.photoId
        ? eq(itemPhotos.id, c.photoId)
        : heldItem(c)
          ? and(eq(itemPhotos.itemId, c.itemId), eq(itemPhotos.review, "pending"))
          : sql`false`,
    );
  return rows.every((r) => visibleToModerators(r.review, r, true));
}
