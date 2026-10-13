import { canoas } from "@fala/instance-canoas";
import type { Config } from "./config";
import { conversation } from "./conversation";
import { fileSender, noSender } from "./sender";
import { pgStore } from "./store";

/** The conversation with the real store and this mode's sender. */
export function connect(config: Config) {
  const store = pgStore(config.databaseUrl);
  const sender = config.mode === "development" ? fileSender(config.outboxDir) : noSender;
  return { handle: conversation({ store, sender, muni: canoas }), sender, close: store.close };
}
