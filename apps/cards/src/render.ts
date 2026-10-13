import { SHARE_CARD_SIZE, type ShareCard } from "@fala/core";
import type { Resvg as ResvgClass } from "@resvg/resvg-wasm";
import type satoriFn from "satori/standalone";
import { cardElement } from "./card";

/** What rendering needs, set up once by whoever runs it (the Worker, or the preview script). */
export interface Renderer {
  satori: typeof satoriFn;
  Resvg: typeof ResvgClass;
  fonts: { regular: ArrayBuffer; semibold: ArrayBuffer; mono: ArrayBuffer };
}

/** The card as a PNG: Satori lays it out as SVG, resvg rasterises it. */
export async function renderCard(card: ShareCard, r: Renderer): Promise<Uint8Array> {
  const svg = await r.satori(cardElement(card), {
    ...SHARE_CARD_SIZE,
    fonts: [
      { name: "Geist", data: r.fonts.regular, weight: 400, style: "normal" },
      { name: "Geist", data: r.fonts.semibold, weight: 600, style: "normal" },
      { name: "Geist Mono", data: r.fonts.mono, weight: 400, style: "normal" },
    ],
  });
  return new r.Resvg(svg, { fitTo: { mode: "width", value: SHARE_CARD_SIZE.width } }).render().asPng();
}
