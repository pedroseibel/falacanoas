/**
 * `bun scripts/preview.ts [dir]`: renders sample cards to PNG files, to look at them without a
 * Worker. Bun may compile WebAssembly from bytes, so the wasm files load straight from disk.
 */
import { outlineOf, type ShareCard } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { readFile, writeFile } from "node:fs/promises";
import satori, { init } from "satori/standalone";
import decodeWebp, { init as initWebp } from "@jsquash/webp/decode";
import { INNER } from "../src/card";
import { cardPhoto } from "../src/photo";
import { renderCard } from "../src/render";

const dir = process.argv[2] ?? "/tmp";
const file = (p: string) => readFile(Bun.resolveSync(p, import.meta.dir));
await init(await file("satori/yoga.wasm"));
await initWasm(await file("@resvg/resvg-wasm/index_bg.wasm"));
await initWebp(await WebAssembly.compile(await file("@jsquash/webp/codec/dec/webp_dec.wasm")));
const font = async (name: string) => new Uint8Array(await readFile(`${import.meta.dir}/../src/fonts/${name}`)).buffer;
const fonts = {
  regular: await font("Geist-Regular.ttf"),
  semibold: await font("Geist-SemiBold.ttf"),
  mono: await font("GeistMono-Regular.ttf"),
};

const niteroi = canoas.geo.neighborhoods.features.find((f) => f.properties.slug === "niteroi");
const outline = niteroi ? outlineOf(niteroi) : null;
// The middle of the bairro's bounding box, for a dot that lands inside it.
const ring = niteroi?.geometry.type === "Polygon" ? (niteroi.geometry.coordinates[0] ?? []) : [];
const mid = (i: number) => (Math.min(...ring.map((c) => c[i] ?? 0)) + Math.max(...ring.map((c) => c[i] ?? 0))) / 2;
const pinned = niteroi ? outlineOf(niteroi, 400, { lng: mid(0), lat: mid(1) }) : null;
// No stock photo: a plain 4:3 card that says it stands for a resident's photo.
const placeholder = new Resvg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#E6E6E9"/><g fill="none" stroke="#B3B5BB" stroke-width="8"><rect x="310" y="215" width="180" height="130" rx="16"/><circle cx="400" cy="280" r="38"/></g></svg>`,
)
  .render()
  .asPng();

const samples: Record<string, ShareCard> = {
  "card-item-photo": {
    kind: "item",
    title: "Parada de ônibus vira poça a cada chuva",
    category: "Rua que alaga toda chuva",
    place: "Niterói",
    days: 43,
    open: true,
    demo: true,
    photo: await cardPhoto(`data:image/png;base64,${Buffer.from(placeholder).toString("base64")}`, INNER, decodeWebp),
    outline,
    link: "falacanoas.com.br/o/7K3QF",
  },
  "card-item-outline": {
    kind: "item",
    title: "Esquina sem rampa de acessibilidade, cadeirantes descem para a rua para atravessar",
    category: "Calçada quebrada ou bloqueada",
    place: "Niterói",
    days: 1,
    open: true,
    demo: false,
    photo: null,
    outline: pinned,
    link: "falacanoas.com.br/o/AC3DE",
  },
  "card-item-fixed": {
    kind: "item",
    title: "Boca de lobo transbordando com chuva fraca",
    category: "Boca de lobo entupida",
    place: "Niterói",
    days: 22,
    open: false,
    demo: true,
    photo: null,
    outline,
    link: "falacanoas.com.br/o/K4M9T",
  },
  "card-bairro": {
    kind: "bairro",
    name: "Niterói",
    open: 29,
    overdue: 12,
    deadlineDays: 30,
    demo: true,
    outline,
    link: "falacanoas.com.br/bairro/niteroi",
  },
};

await Promise.all(
  Object.entries(samples).map(async ([name, card]) => {
    const png = await renderCard(card, { satori, Resvg, fonts });
    await writeFile(`${dir}/${name}.png`, png);
    console.log(`${dir}/${name}.png ${(png.length / 1024).toFixed(0)} kB`);
  }),
);
