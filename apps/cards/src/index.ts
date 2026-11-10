import { ShareCardSchema } from "@fala/core";
import decodeWebp, { init as initWebp } from "@jsquash/webp/decode";
import webpWasm from "@jsquash/webp/codec/dec/webp_dec.wasm";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { WorkerEntrypoint } from "cloudflare:workers";
import yogaWasm from "satori/yoga.wasm";
import satori, { init as initSatori } from "satori/standalone";
import { INNER } from "./card";
import mono from "./fonts/GeistMono-Regular.ttf?inline";
import regular from "./fonts/Geist-Regular.ttf?inline";
import semibold from "./fonts/Geist-SemiBold.ttf?inline";
import { provideLocation } from "./location";
import { cardPhoto, dataUrlBytes } from "./photo";
import { renderCard, type Renderer } from "./render";

/** resvg refuses a second init; that it already ran is what we wanted. */
const initResvg = () =>
  initWasm(resvgWasm).catch((e: unknown) => {
    if (!String(e).includes("Already initialized")) throw e;
  });

/** Set up once per isolate: the three Wasm modules and the fonts. A failure is retried next time. */
let ready: Promise<Renderer> | null = null;
const renderer = () =>
  (ready ??= Promise.resolve()
    .then(provideLocation)
    .then(() => Promise.all([initSatori(yogaWasm), initResvg(), initWebp(webpWasm)]))
    .then(() => ({
      satori,
      Resvg,
      fonts: { regular: dataUrlBytes(regular), semibold: dataUrlBytes(semibold), mono: dataUrlBytes(mono) },
    }))
    .catch((e: unknown) => {
      ready = null;
      throw e;
    }));

/**
 * Share cards (DECISIONS rounds 11 and 15). The app describes the card; this Worker draws it. It
 * reads nothing and keeps nothing, so it holds no secrets and no database role.
 */
export default class Cards extends WorkerEntrypoint {
  async fetch(): Promise<Response> {
    return new Response("Não encontrado.", { status: 404 });
  }

  async render(input: unknown): Promise<Uint8Array> {
    return this.draw(input).catch((e: unknown) => {
      // A stack doesn't cross the service binding; the message does.
      throw new Error(e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e));
    });
  }

  private async draw(input: unknown): Promise<Uint8Array> {
    const card = ShareCardSchema.parse(input);
    const r = await renderer();
    const photo = card.kind === "item" && card.photo ? await cardPhoto(card.photo, INNER, (b) => decodeWebp(b)) : null;
    return renderCard(card.kind === "item" ? { ...card, photo } : card, r);
  }
}
