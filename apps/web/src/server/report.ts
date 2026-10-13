import {
  digestDay,
  holdsPublication,
  inElection,
  itemFromReport,
  limitMessage,
  newItemId,
  postingLimits,
  prescreen,
  reportSchema,
  type Item,
  type ReportFields,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { JoinSchema, readJoinFormData, readReportFormData } from "@/features/report/report-model";
import { db } from "./db/client";
import { createdSince, findItem, hashKey, insertItem, itemExists, joinItem, photosSince } from "./items";
import { openCase } from "./moderation-store";
import { markNickPublished } from "./nicks";
import { member, type Failure } from "./member";
import { formData, keepPhotos, PHOTO_ERROR } from "./photo-intake";
import { removePhotos } from "./photos";
import { getSession } from "./session";
import { notifyPlaces } from "./push-send";
import { isHuman, recordEvidence } from "./vault";

/**
 * The report flow's writes (research/DECISIONS.md, rounds 2, 3, 4, 6, 15 and 18). Posting needs a
 * phone-verified account with an apelido, or, as a guest, a photo and a robot check: a guest pin is
 * held for moderation and followed through a secret link.
 */

const schema = reportSchema(canoas);

export type ReportResult =
  | Failure
  | {
      ok: true;
      item: Item;
      digest: "hoje" | "amanhã";
      /** A guest pin's secret link: the only way back to it until moderation publishes it. */
      tracking?: string;
    };

/** Guest pins per guest session per day: enough for a neighbour, too few to flood moderation. */
const GUEST_PER_DAY = 3;
const DAY = 86_400_000;
export type JoinResult =
  | Failure
  | {
      ok: true;
      item: Item;
      /** "counts", or why it doesn't (yet): an earlier confirmation, or a phone verified less than 72 h ago. */
      confirmation: "counts" | "already" | "too-new";
    };

async function uniqueId(): Promise<string> {
  const id = newItemId(crypto.getRandomValues(new Uint32Array(5)));
  return (await itemExists(id)) ? uniqueId() : id;
}

export const createReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<ReportResult> => {
    const session = (await getSession())?.user;
    if (session?.isAnonymous) return createGuestPin(data, session.id);
    const who = await member();
    if ("error" in who) return who;
    const parsed = schema.safeParse(readReportFormData(data));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
    const now = new Date();
    // Daily limits (round 19): far lower for an account whose phone is less than 72 h old.
    const limits = postingLimits(who.phoneVerifiedAt, now);
    if ((await createdSince(who.id, DAY, now)) >= limits.pins)
      return { ok: false, error: limitMessage("pins", limits) };
    if ((await photosSince(who.id, DAY, now)) + parsed.data.photos.length > limits.photos)
      return { ok: false, error: limitMessage("photos", limits) };
    const photos = await keepPhotos(parsed.data.photos);
    if (!photos) return { ok: false, error: PHOTO_ERROR };
    const id = await uniqueId();
    // The pre-screen (round 5): personal data, insults, named people, anonymous propaganda in a
    // campaign. Anything it flags waits for a moderator instead of going out; so does everything a
    // muted account sends (round 19).
    const flags = prescreen(`${parsed.data.title} ${parsed.data.text}`, { electoral: inElection(canoas, now) });
    const muted = who.standing.kind === "mute";
    const held = muted || holdsPublication(flags, parsed.data.visibility);
    const item: Item = {
      ...itemFromReport(parsed.data, canoas, { id, nick: who.nick, photos: photos.srcs, now }),
      ...(held ? { moderation: "pending" } : {}),
    };
    try {
      await insertItem(item, who.id, now);
      if (held) await openCase(db, id, muted ? "muted" : "prescreen", flags);
    } catch (e) {
      await removePhotos(photos.keys);
      throw e;
    }
    if (parsed.data.visibility === "pseudonymous") await markNickPublished(who.id);
    await recordEvidence("publication", who.id, item.id);
    // As readers see it: its photos wait for moderation's first look, as a count, not as images.
    const stored = (await findItem(id, now)) ?? item;
    // Published at once: the neighbours following this place hear of it. A held report waits for moderation.
    if (!held) notifyPlaces(stored, who.id);
    return { ok: true, item: stored, digest: digestDay(now, canoas) };
  });

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export const joinReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<JoinResult> => {
    const who = await member();
    if ("error" in who) return who;
    const parsed = JoinSchema.safeParse(readJoinFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o registro." };
    const limits = postingLimits(who.phoneVerifiedAt, new Date());
    if (parsed.data.photos.length && (await photosSince(who.id, DAY)) + parsed.data.photos.length > limits.photos)
      return { ok: false, error: limitMessage("photos", limits) };
    const photos = await keepPhotos(parsed.data.photos);
    if (!photos) return { ok: false, error: PHOTO_ERROR };
    // Independent confirmations only (round 18, Q17): one per account, phone verified ≥72 h ago.
    const joined = await joinItem({
      id: parsed.data.itemId,
      accountId: who.id,
      by: parsed.data.visibility === "anonymous" ? "Anônimo" : who.nick,
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
    if (parsed.data.visibility === "pseudonymous" && (joined.confirmation === "counts" || photos.srcs.length))
      await markNickPublished(who.id);
    await recordEvidence("confirmation", who.id, joined.item.id);
    return { ok: true, ...joined };
  });

/**
 * A guest pin (round 2, round 18 Q4): an anonymous session, a photo, a robot check; it appears as
 * Anônimo, waits for moderation before it shows on the map, and needs two independent confirmations
 * to count. Traceable within the limits of the access logs, never identified.
 */
async function createGuestPin(data: FormData, guestId: string): Promise<ReportResult> {
  const parsed = schema.safeParse(readReportFormData(data));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
  if (parsed.data.kind !== "occurrence")
    return { ok: false, error: "Sem conta, dá para registrar um problema num lugar. Questões públicas pedem celular." };
  const token = data.get("turnstile");
  if (!(await isHuman(typeof token === "string" ? token : null)))
    return {
      ok: false,
      error:
        "A verificação anti-robô não passou. Tente publicar de novo; se continuar, recarregue a página (as fotos escolhidas se perdem).",
    };
  if ((await createdSince(guestId, DAY)) >= GUEST_PER_DAY)
    return { ok: false, error: "Sem conta, são até 3 registros por dia. Entre com o celular para registrar mais." };
  const photos = await keepPhotos(parsed.data.photos);
  if (!photos) return { ok: false, error: PHOTO_ERROR };
  const now = new Date();
  const id = await uniqueId();
  const fields: ReportFields = { ...parsed.data, visibility: "anonymous" };
  const item: Item = {
    ...itemFromReport(fields, canoas, { id, nick: "Anônimo", photos: photos.srcs, now }),
    guest: true,
    moderation: "pending",
  };
  const key = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  try {
    await insertItem(item, guestId, now, await hashKey(key));
    // Every guest pin waits for a moderator; the pre-screen's flags go with it.
    await openCase(
      db,
      id,
      "guest_pin",
      prescreen(`${item.title} ${item.text}`, { electoral: inElection(canoas, now) }),
    );
  } catch (e) {
    await removePhotos(photos.keys);
    throw e;
  }
  await recordEvidence("guest_pin", guestId, id);
  return {
    ok: true,
    item: (await findItem(id, now)) ?? item,
    digest: digestDay(now, canoas),
    tracking: `/o/${id}?chave=${key}`,
  };
}
