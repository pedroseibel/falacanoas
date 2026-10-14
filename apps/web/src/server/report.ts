import {
  digestDay,
  inElection,
  itemFromReport,
  prescreen,
  reportSchema,
  type Item,
  type ReportFields,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { createServerFn } from "@tanstack/react-start";
import { JoinSchema, readJoinFormData, readReportFormData } from "@/features/report/report-model";
import { db } from "./db/client";
import { createdSince, findItem, hashKey, insertItem } from "./items";
import { member } from "./member";
import { openCase } from "./moderation-store";
import { formData, keepPhotos, PHOTO_ERROR } from "./photo-intake";
import { removePhotos } from "./photos";
import {
  addressLater,
  DAY,
  joinReport as join,
  publishReport,
  uniqueId,
  type JoinResult,
  type ReportResult,
} from "./report-store";
import { getSession } from "./session";
import { isHuman, recordEvidence } from "./vault";

export type { JoinResult, ReportResult } from "./report-store";

/**
 * The report flow's writes (research/DECISIONS.md, rounds 2, 3, 4, 6, 15 and 18). Posting needs a
 * phone-verified account with an apelido, or, as a guest, a photo and a robot check: a guest pin is
 * held for moderation and followed through a secret link.
 */

const schema = reportSchema(canoas);

/** Guest pins per guest session per day: enough for a neighbour, too few to flood moderation. */
const GUEST_PER_DAY = 3;

export const createReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<ReportResult> => {
    const session = (await getSession())?.user;
    if (session?.isAnonymous) return createGuestPin(data, session.id);
    const who = await member();
    if ("error" in who) return who;
    const parsed = schema.safeParse(readReportFormData(data));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
    return publishReport(who, parsed.data);
  });

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export const joinReport = createServerFn({ method: "POST" })
  .validator(formData)
  .handler(async ({ data }): Promise<JoinResult> => {
    const who = await member();
    if ("error" in who) return who;
    const parsed = JoinSchema.safeParse(readJoinFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o registro." };
    return join(who, parsed.data);
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
      prescreen(`${item.title} ${item.text} ${item.reference ?? ""}`, { electoral: inElection(canoas, now) }),
    );
  } catch (e) {
    await removePhotos(photos.keys);
    throw e;
  }
  addressLater(item);
  await recordEvidence("guest_pin", guestId, id);
  return {
    ok: true,
    item: (await findItem(id, now)) ?? item,
    digest: digestDay(now, canoas),
    tracking: `/o/${id}?chave=${key}`,
  };
}
