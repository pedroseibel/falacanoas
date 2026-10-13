import { canoas } from "@fala/instance-canoas";
import type { Config } from "./config";
import { fileOutbox, noOutbox } from "./outbox";
import { runDigest, type RunResult } from "./run";
import { pgStore } from "./store";

/** One run with the real store and the outbox for this mode. */
export async function digestNow(config: Config, now = new Date()): Promise<RunResult> {
  const store = pgStore(config.databaseUrl, canoas.branding.name);
  try {
    return await runDigest(
      {
        store,
        outbox: config.mode === "development" ? fileOutbox(config.outboxDir) : noOutbox,
        muni: canoas,
        recipients: { from: config.from, to: config.to, cc: config.cc },
      },
      now,
    );
  } finally {
    await store.close();
  }
}
