import {
  digestDay,
  holdsPublication,
  inElection,
  itemFromReport,
  limitMessage,
  newItemId,
  postingLimits,
  prescreen,
  type Connection,
  type Item,
  type ReportFields,
  type Visibility,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { db } from "./db/client";
import { createdSince, findItem, insertItem, itemExists, joinItem, photosSince } from "./items";
import type { Failure, Member } from "./member";
import { openCase } from "./moderation-store";
import { markNickPublished } from "./nicks";
import { keepPhotos, PHOTO_ERROR } from "./photo-intake";
import { storeAddress } from "./address";
import { inBackground } from "./background";
import { removePhotos } from "./photos";
import { notifyPlaces } from "./push-send";
import { recordEvidence } from "./vault";

/**
 * Publishing a problem and adding to one, for a member already identified: by the session (the
 * report form, report.ts) or by the vault through the WhatsApp number (whatsapp-intake.ts). Server-only.
 */

export type ReportResult =
  | Failure
  | {
      ok: true;
      item: Item;
      digest: "hoje" | "amanhã";
      /** A guest pin's secret link: the only way back to it until moderation publishes it. */
      tracking?: string;
    };

export type JoinResult =
  | Failure
  | {
      ok: true;
      item: Item;
      /** "counts", or why it doesn't (yet): an earlier confirmation, or a phone verified less than 72 h ago. */
      confirmation: "counts" | "already" | "too-new";
    };

export const DAY = 86_400_000;

/** A report on a point gets its street and number looked up once, after the response. */
export function addressLater(item: Item): void {
  const s = item.scope;
  if ((s.type === "point" || s.type === "place") && s.lng !== undefined && s.lat !== undefined)
    inBackground("endereço", storeAddress(item.id, [s.lng, s.lat]));
}

export async function uniqueId(): Promise<string> {
  const id = newItemId(crypto.getRandomValues(new Uint32Array(5)));
  return (await itemExists(id)) ? uniqueId() : id;
}

/** A member's report, already parsed with reportSchema. `connection` defaults to this request's. */
export async function publishReport(who: Member, fields: ReportFields, connection?: Connection): Promise<ReportResult> {
  const now = new Date();
  // Daily limits (round 19): far lower for an account whose phone is less than 72 h old.
  const limits = postingLimits(who.phoneVerifiedAt, now);
  if ((await createdSince(who.id, DAY, now)) >= limits.pins) return { ok: false, error: limitMessage("pins", limits) };
  if ((await photosSince(who.id, DAY, now)) + fields.photos.length > limits.photos)
    return { ok: false, error: limitMessage("photos", limits) };
  const photos = await keepPhotos(fields.photos);
  if (!photos) return { ok: false, error: PHOTO_ERROR };
  const id = await uniqueId();
  // The pre-screen (round 5): personal data, insults, named people, anonymous propaganda in a
  // campaign. Anything it flags waits for a moderator instead of going out; so does everything a
  // muted account sends (round 19).
  const flags = prescreen(`${fields.title} ${fields.text} ${fields.reference}`, { electoral: inElection(canoas, now) });
  const muted = who.standing.kind === "mute";
  const held = muted || holdsPublication(flags, fields.visibility);
  const item: Item = {
    ...itemFromReport(fields, canoas, { id, nick: who.nick, photos: photos.srcs, now }),
    ...(held ? { moderation: "pending" } : {}),
  };
  try {
    await insertItem(item, who.id, now);
    if (held) await openCase(db, id, muted ? "muted" : "prescreen", flags);
  } catch (e) {
    await removePhotos(photos.keys);
    throw e;
  }
  if (fields.visibility === "pseudonymous") await markNickPublished(who.id);
  addressLater(item);
  await recordEvidence("publication", who.id, item.id, connection);
  // As readers see it: its photos wait for moderation's first look, as a count, not as images.
  const stored = (await findItem(id, now)) ?? item;
  // Published at once: the neighbours following this place hear of it. A held report waits for moderation.
  if (!held) notifyPlaces(stored, who.id);
  return { ok: true, item: stored, digest: digestDay(now, canoas) };
}

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export async function joinReport(
  who: Member,
  join: { itemId: string; visibility: Visibility; photos: File[] },
  connection?: Connection,
): Promise<JoinResult> {
  const limits = postingLimits(who.phoneVerifiedAt, new Date());
  if (join.photos.length && (await photosSince(who.id, DAY)) + join.photos.length > limits.photos)
    return { ok: false, error: limitMessage("photos", limits) };
  const photos = await keepPhotos(join.photos);
  if (!photos) return { ok: false, error: PHOTO_ERROR };
  // Independent confirmations only (round 18, Q17): one per account, phone verified ≥72 h ago.
  const joined = await joinItem({
    id: join.itemId,
    accountId: who.id,
    by: join.visibility === "anonymous" ? "Anônimo" : who.nick,
    photos: photos.srcs,
    phoneVerifiedAt: who.phoneVerifiedAt,
    now: new Date(),
  }).catch(async (e: unknown) => {
    await removePhotos(photos.keys);
    throw e;
  });
  if (!joined) {
    await removePhotos(photos.keys);
    return { ok: false, error: "Esse registro não está mais aberto. Publique o seu." };
  }
  if (join.visibility === "pseudonymous" && (joined.confirmation === "counts" || photos.srcs.length))
    await markNickPublished(who.id);
  await recordEvidence("confirmation", who.id, joined.item.id, connection);
  return { ok: true, ...joined };
}
