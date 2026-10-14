import { canoas } from "@fala/instance-canoas";
import { ADDRESSEE, type Config } from "./config";
import { fileOutbox, noOutbox } from "./outbox";
import { sitePhotos } from "./pdf/photos";
import { renderPdf } from "./pdf/render";
import { openFreeMap } from "./pdf/tiles";
import { readMail, takeReply, type ReplyOutcome, type Senders } from "./replies";
import { runDigest, type RunResult } from "./run";
import { pgReplyStore, pgStore } from "./store";

/** One run with the real store, the PDF and the outbox for this mode. */
export async function digestNow(config: Config, now = new Date()): Promise<RunResult> {
  const store = pgStore(config.databaseUrl, canoas.branding.name, canoas.timezone);
  const tiles = openFreeMap(config.cacheDir);
  const photos = sitePhotos(`https://${canoas.branding.domain}`, config.photoBase);
  try {
    return await runDigest(
      {
        store,
        outbox: config.mode === "development" ? fileOutbox(config.outboxDir) : noOutbox,
        muni: canoas,
        recipients: { from: config.from, to: config.to, cc: config.cc },
        pdf: (doc) => renderPdf(doc, { muni: canoas, tiles, photos, addressee: ADDRESSEE, sentAt: now }),
      },
      now,
    );
  } finally {
    await store.close();
  }
}

export const senders = (config: Config): Senders => ({ to: config.to, cc: config.cc, names: ADDRESSEE });

/** One reply to a resumo, as raw e-mail: read, applied as far as it's safe, recorded. */
export async function replyNow(
  config: Config,
  raw: string | Uint8Array,
  { operator = false }: { operator?: boolean } = {},
): Promise<ReplyOutcome> {
  const store = pgReplyStore(config.databaseUrl, canoas.branding.name, canoas.timezone);
  try {
    return await takeReply(store, senders(config), await readMail(raw, config.authserv), { operator });
  } finally {
    await store.close();
  }
}
