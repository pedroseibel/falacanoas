import { canoas } from "@fala/instance-canoas";
import type { Config } from "./config";
import { conversation, type Photos } from "./conversation";
import { readyPhoto } from "./photos";
import { provider } from "./provider";
import { fileSender, noSender } from "./sender";
import { site } from "./site";
import { pgStore } from "./store";

/** Development: a photo "sent" by /dev/mensagem or `bun run mensagem --foto` is a local file. */
const DEV_MEDIA = "arquivo:";

/**
 * The conversation with the real store, this mode's sender, and registering by WhatsApp when the
 * site's tokens are set and photos can be fetched (from the provider; in development, from disk).
 */
export function connect(config: Config) {
  const store = pgStore(config.databaseUrl);
  const development = config.mode === "development";
  const live = provider;
  const sender = development ? fileSender(config.outboxDir) : noSender;
  const media = development
    ? async (id: string) => {
        if (!id.startsWith(DEV_MEDIA)) throw new Error("mídia desconhecida");
        return Bun.file(id.slice(DEV_MEDIA.length)).bytes();
      }
    : live && ((id: string) => live.media(id));
  const photos: Photos | null = media && (async (id) => readyPhoto(await media(id)));
  const reports = config.site && photos ? { site: site(config.site), photos } : null;
  if (!reports) console.info("registro por WhatsApp desligado: faltam os tokens do site ou um provedor.");
  return { handle: conversation({ store, sender, muni: canoas, reports }), sender, reports, close: store.close };
}

export const devMedia = (path: string) => `${DEV_MEDIA}${path}`;
