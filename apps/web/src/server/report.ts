import { digestDay, itemFromReport, newItemId, reportSchema, type Item } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { JoinSchema, readJoinFormData, readReportFormData } from "@/features/report/report-model";
import { createdSince, insertItem, itemExists, joinItem } from "./items";
import { markNickPublished } from "./nicks";
import { member, type Failure } from "./member";
import { formData, keepPhotos, PHOTO_ERROR } from "./photo-intake";
import { removePhotos } from "./photos";
import { recordEvidence } from "./vault";

/**
 * The report flow's writes (research/DECISIONS.md, rounds 3, 4, 6 and 15). Posting needs a
 * phone-verified account with an apelido; guest pins held for moderation come later.
 */

const schema = reportSchema(canoas);
const HOUR = 3_600_000;
const PER_HOUR = 10;

export type ReportResult = Failure | { ok: true; item: Item; digest: "hoje" | "amanhã" };
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
  .inputValidator(formData)
  .handler(async ({ data }): Promise<ReportResult> => {
    const who = await member();
    if ("error" in who) return who;
    const parsed = schema.safeParse(readReportFormData(data));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
    if ((await createdSince(who.id, HOUR)) >= PER_HOUR)
      return { ok: false, error: "Você fez muitos registros na última hora. Tente de novo mais tarde." };
    const photos = await keepPhotos(parsed.data.photos);
    if (!photos) return { ok: false, error: PHOTO_ERROR };
    const now = new Date();
    const id = await uniqueId();
    const item = itemFromReport(parsed.data, canoas, { id, nick: who.nick, photos: photos.srcs, now });
    try {
      await insertItem(item, who.id, now);
    } catch (e) {
      await removePhotos(photos.keys);
      throw e;
    }
    if (parsed.data.visibility === "pseudonymous") await markNickPublished(who.id);
    await recordEvidence("publication", who.id, item.id);
    return { ok: true, item, digest: digestDay(now, canoas) };
  });

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export const joinReport = createServerFn({ method: "POST" })
  .inputValidator(formData)
  .handler(async ({ data }): Promise<JoinResult> => {
    const who = await member();
    if ("error" in who) return who;
    const parsed = JoinSchema.safeParse(readJoinFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o registro." };
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
