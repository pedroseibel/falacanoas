import { canoas } from "@fala/instance-canoas";
import { ADDRESSEE, type Config } from "./config";
import { fileOutbox, noOutbox } from "./outbox";
import { sitePhotos } from "./pdf/photos";
import { renderPdf } from "./pdf/render";
import { openFreeMap } from "./pdf/tiles";
import { runDigest, type RunResult } from "./run";
import { pgStore } from "./store";

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
