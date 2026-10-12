import {
  confirmationStatus,
  confirmItem,
  dateAgo,
  digestDay,
  isOpen,
  itemFromReport,
  newItemId,
  reportSchema,
  stripImageMetadata,
  type Item,
} from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { createServerFn } from "@tanstack/react-start";
import { JoinSchema, readJoinFormData, readReportFormData } from "@/features/report/report-model";
import { markNickPublished } from "./nicks";
import { getSession } from "./session";
import * as store from "./store";

/**
 * The report flow's writes (research/DECISIONS.md, rounds 3, 4, 6 and 15). Posting needs a
 * phone-verified account with an apelido; guest pins held for moderation come later.
 */

const schema = reportSchema(canoas);
const HOUR = 3_600_000;
const PER_HOUR = 10;

type Failure = { ok: false; error: string };
export type ReportResult =
  | Failure
  | { ok: true; item: Item; digest: "hoje" | "amanhã"; /** False until the database exists. */ persisted: boolean };
export type JoinResult =
  | Failure
  | {
      ok: true;
      item: Item;
      /** "counts", or why it doesn't (yet): an earlier confirmation, or a phone verified less than 72 h ago. */
      confirmation: "counts" | "already" | "too-new";
    };

const formData = (data: FormData) => {
  if (!(data instanceof FormData)) throw new Error("Envio inválido.");
  return data;
};

async function reporter(): Promise<{ id: string; nick: string; phoneVerifiedAt: Date | null } | Failure> {
  const user = (await getSession())?.user;
  if (!user || user.isAnonymous || !user.phoneNumberVerified)
    return { ok: false, error: "Entre com o seu celular para registrar." };
  if (!user.nick) return { ok: false, error: "Escolha um apelido antes de registrar." };
  return { id: user.id, nick: user.nick, phoneVerifiedAt: user.phoneVerifiedAt ?? null };
}

/** Strips metadata from every photo, then stores them, but only if all of them are images. */
async function keepPhotos(files: File[]): Promise<string[] | null> {
  if (files.length > store.photoRoom()) return null;
  const clean = await Promise.all(files.map(async (f) => stripImageMetadata(new Uint8Array(await f.arrayBuffer()))));
  if (clean.some((image) => !image)) return null;
  return clean.flatMap((image) => (image ? [store.putPhoto(image.bytes, image.type)] : []));
}

function uniqueId(): string {
  for (;;) {
    const id = newItemId(crypto.getRandomValues(new Uint32Array(5)));
    if (!store.hasItem(id)) return id;
  }
}

const PHOTO_ERROR = "Não deu para ler uma das fotos. Tire outra ou escolha outra da galeria.";

export const createReport = createServerFn({ method: "POST" })
  .inputValidator(formData)
  .handler(async ({ data }): Promise<ReportResult> => {
    const who = await reporter();
    if ("error" in who) return who;
    const parsed = schema.safeParse(readReportFormData(data));
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira o registro." };
    if (store.createdSince(who.id, HOUR) >= PER_HOUR)
      return { ok: false, error: "Você fez muitos registros na última hora. Tente de novo mais tarde." };
    const photos = await keepPhotos(parsed.data.photos);
    if (!photos) return { ok: false, error: PHOTO_ERROR };
    const now = new Date();
    const item = itemFromReport(parsed.data, canoas, { id: uniqueId(), nick: who.nick, photos, now });
    store.addItem(item, who.id);
    // The author's own report never counts as a neighbour's confirmation.
    store.markConfirmed(item.id, who.id);
    if (parsed.data.visibility === "pseudonymous") markNickPublished(who.id);
    return { ok: true, item, digest: digestDay(now, canoas), persisted: false };
  });

/** "Já existe algo parecido": confirm the existing problem and add the photos to its timeline. */
export const joinReport = createServerFn({ method: "POST" })
  .inputValidator(formData)
  .handler(async ({ data }): Promise<JoinResult> => {
    const who = await reporter();
    if ("error" in who) return who;
    const parsed = JoinSchema.safeParse(readJoinFormData(data));
    if (!parsed.success) return { ok: false, error: "Confira o registro." };
    const item = store.findItem(parsed.data.itemId);
    if (!item || item.kind !== "occurrence" || !isOpen(item))
      return { ok: false, error: "Esse registro não está mais aberto. Publique o seu." };
    const photos = await keepPhotos(parsed.data.photos);
    if (!photos) return { ok: false, error: PHOTO_ERROR };
    const now = new Date();
    // Independent confirmations only (round 18, Q17): one per account, phone verified ≥72 h ago.
    const confirmation = confirmationStatus({
      alreadyConfirmed: store.hasConfirmed(item.id, who.id),
      phoneVerifiedAt: who.phoneVerifiedAt,
      now,
    });
    if (confirmation === "counts") store.markConfirmed(item.id, who.id);
    // Derived histories are dated against the fixtures' clock, like the item page.
    const fixturesNow = new Date(fixtures.now);
    const next = confirmItem(item, canoas, {
      by: parsed.data.visibility === "anonymous" ? "Anônimo" : who.nick,
      photos,
      now,
      counts: confirmation === "counts",
      dateAgo: (days) => dateAgo(fixturesNow, days),
    });
    store.replaceItem(next);
    if (parsed.data.visibility === "pseudonymous" && next !== item) markNickPublished(who.id);
    return { ok: true, item: next, confirmation };
  });
