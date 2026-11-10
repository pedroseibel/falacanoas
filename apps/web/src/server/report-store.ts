import {
  type Connection,
  DAY_MS,
  digestDay,
  holdsPublication,
  inElection,
  type Item,
  itemFromReport,
  itemLngLat,
  itemPath,
  limitMessage,
  type ModerationFlag,
  newItemId,
  postingLimits,
  prescreen,
  type ReportFields,
  type Visibility,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import {
  createdSince,
  findItem,
  hashKey,
  insertItem,
  itemExists,
  itemIdByClientKey,
  joinItem,
  photosSince,
} from "./items";
import type { Failure, Member } from "./member";
import type { CaseReason } from "./moderation-store";
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

/** A report on a point gets its street and number looked up once, after the response. */
function addressLater(item: Item): void {
  const at = itemLngLat(item);
  if (at) inBackground("endereço", storeAddress(item.id, at));
}

async function uniqueId(): Promise<string> {
  const id = newItemId(crypto.getRandomValues(new Uint32Array(5)));
  return (await itemExists(id)) ? uniqueId() : id;
}

/** The report a retry repeats, as the first send would have answered. */
async function already(id: string, now: Date): Promise<ReportResult> {
  const item = await findItem(id, now);
  return item ? { ok: true, item, digest: digestDay(now, canoas) } : { ok: false, error: "Confira o registro." };
}

interface Sender {
  accountId: string;
  /** The apelido, or "Anônimo" for a guest. */
  nick: string;
  guest?: boolean;
  trackingKeyHash?: string;
  clientKey?: string;
  /**
   * Why this sender's report waits for a moderator, given what the pre-screen flagged (round 5:
   * personal data, insults, named people, anonymous propaganda in a campaign); null publishes it.
   */
  holdFor: (flags: ModerationFlag[]) => CaseReason | null;
}

/**
 * Every new report goes in here, whoever sends it: its photos are stored, it is pre-screened, and
 * the item, its photos and its moderation case are written together. Photos stored for a report
 * that then fails to save are removed.
 */
async function storeReport(
  fields: ReportFields,
  sender: Sender,
  now: Date,
): Promise<{ item: Item; held: boolean } | Failure> {
  const photos = await keepPhotos(fields.photos);
  if (!photos) return { ok: false, error: PHOTO_ERROR };
  const id = await uniqueId();
  const flags = prescreen(`${fields.title} ${fields.text} ${fields.reference}`, { electoral: inElection(canoas, now) });
  const reason = sender.holdFor(flags);
  const item: Item = {
    ...itemFromReport(fields, canoas, { id, nick: sender.nick, photos: photos.srcs, now }),
    ...(sender.guest ? { guest: true } : {}),
  };
  try {
    await insertItem(item, {
      accountId: sender.accountId,
      now,
      hold: reason ? { reason, flags } : null,
      trackingKeyHash: sender.trackingKeyHash,
      clientKey: sender.clientKey,
    });
  } catch (e) {
    await removePhotos(photos.keys);
    throw e;
  }
  addressLater(item);
  // As readers see it: its photos wait for moderation's first look, as a count, not as images.
  return { item: (await findItem(id, now)) ?? item, held: Boolean(reason) };
}

/**
 * A member's report, already parsed with reportSchema. `connection` defaults to this request's.
 * `clientKey`: the key the phone gave it before sending (the form's outbox), so a retry after a lost
 * response gets the same item back instead of a second one.
 */
export async function publishReport(
  who: Member,
  fields: ReportFields,
  connection?: Connection,
  clientKey?: string,
): Promise<ReportResult> {
  const now = new Date();
  // Before the limits: a retry of a report that already counted must not be refused by them.
  const known = clientKey ? await itemIdByClientKey(clientKey, who.id) : null;
  if (known) return already(known, now);
  // Daily limits (round 19): far lower for an account whose phone is less than 72 h old.
  const limits = postingLimits(who.phoneVerifiedAt, now);
  if ((await createdSince(who.id, DAY_MS, now)) >= limits.pins)
    return { ok: false, error: limitMessage("pins", limits) };
  if ((await photosSince(who.id, DAY_MS, now)) + fields.photos.length > limits.photos)
    return { ok: false, error: limitMessage("photos", limits) };
  // Everything a muted account sends waits for a moderator (round 19).
  const muted = who.standing.kind === "mute";
  const stored = await storeReport(
    fields,
    {
      accountId: who.id,
      nick: who.nick,
      clientKey,
      holdFor: (flags) => (muted ? "muted" : holdsPublication(flags, fields.visibility) ? "prescreen" : null),
    },
    now,
  ).catch(async (e: unknown) => {
    // The same report sent twice at once: the other request made it.
    const raced = clientKey ? await itemIdByClientKey(clientKey, who.id) : null;
    if (raced) return already(raced, now);
    throw e;
  });
  if ("ok" in stored) return stored;
  if (fields.visibility === "pseudonymous") await markNickPublished(who.id);
  await recordEvidence("publication", who.id, stored.item.id, connection);
  // Published at once: the neighbours following this place hear of it. A held report waits for moderation.
  if (!stored.held) notifyPlaces(stored.item, who.id);
  return { ok: true, item: stored.item, digest: digestDay(now, canoas) };
}

/** Guest pins per guest session per day: enough for a neighbour, too few to flood moderation. */
const GUEST_PER_DAY = 3;

/**
 * A guest pin (round 2, round 18 Q4), already parsed and past the robot check: it appears as Anônimo,
 * always waits for moderation before it shows on the map, and is followed through a secret link.
 */
export async function publishGuestReport(guestId: string, report: ReportFields): Promise<ReportResult> {
  const now = new Date();
  if ((await createdSince(guestId, DAY_MS, now)) >= GUEST_PER_DAY)
    return {
      ok: false,
      error: `Sem conta, são até ${GUEST_PER_DAY} registros por dia. Entre com o celular para registrar mais.`,
    };
  const key = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  const stored = await storeReport(
    { ...report, visibility: "anonymous" },
    {
      accountId: guestId,
      nick: "Anônimo",
      guest: true,
      trackingKeyHash: await hashKey(key),
      holdFor: () => "guest_pin",
    },
    now,
  );
  if ("ok" in stored) return stored;
  await recordEvidence("guest_pin", guestId, stored.item.id);
  return {
    ok: true,
    item: stored.item,
    digest: digestDay(now, canoas),
    tracking: `${itemPath(stored.item.id)}?chave=${key}`,
  };
}

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export async function joinReport(
  who: Member,
  join: { itemId: string; visibility: Visibility; photos: File[] },
  connection?: Connection,
): Promise<JoinResult> {
  const limits = postingLimits(who.phoneVerifiedAt, new Date());
  if (join.photos.length && (await photosSince(who.id, DAY_MS)) + join.photos.length > limits.photos)
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
