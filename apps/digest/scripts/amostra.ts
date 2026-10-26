import { digestDocument, type DigestItem } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { ADDRESSEE } from "../src/config";
import { renderPdf } from "../src/pdf/render";
import { openFreeMap } from "../src/pdf/tiles";

/**
 * `bun run amostra [registros]`: the resumo's PDF from the fictional demo data, to see the layout
 * without a database. Every page says it's a sample. A real resumo never carries demo items; here
 * they're let through on purpose, and photos come from the web app's public folder.
 */
const count = Number(process.argv[2]) || 24;
const sentAt = new Date("2026-10-13T21:00:00Z"); // 18h in Canoas
const out = fileURLToPath(new URL("../outbox/", import.meta.url));
const media = fileURLToPath(new URL("../../web/public/", import.meta.url));

// A plausible day: spread over the categories, in the order the fixtures list them.
const pool = fixtures.items.filter((it) => it.kind === "occurrence" && it.scope.type !== "municipality");
const byCategory = Map.groupBy(pool, (it) => it.category);
const picked: DigestItem[] = [];
for (let round = 0; picked.length < count && round < 50; round++)
  for (const items of byCategory.values()) {
    const it = items[round];
    if (it && picked.length < count) picked.push(it);
  }

// The fixtures' own photos stay with their reports. The others get plain placeholders, so every photo
// layout (one to four) shows without a photo of some other problem posing as this one's.
const PLACEHOLDER = "https://exemplo.invalid/foto/";
const lend = [1, 0, 2, 0, 4, 0, 0, 3, 1, 0, 2];
// Some residents give a ponto de referência; how one reads in a record.
const references = ["em frente à parada de ônibus", "", "ao lado da praça", "", ""];
// A street that floods, as one reads with the resident's answers and the day's rain. Fictional, like
// every figure in the sample.
const SAMPLE_RAIN = {
  gauge: 7325,
  name: "Mathias Velho",
  agency: "Cemaden",
  page: "https://resources.cemaden.gov.br/graficos/interativo/grafico_CEMADEN.php?idpcd=7325&uf=RS",
  meters: 1240,
  mm: 42.6,
  until: new Date(sentAt.getTime() - 2 * 3600_000).toISOString(),
};
const day = picked.map((it, i): DigestItem => ({
  ...it,
  ...(it.category === "alaga"
    ? { flooding: it.flooding ?? { cause: "bueiro", raining: true, duration: "1_3h" }, rain: SAMPLE_RAIN }
    : {}),
  ...(references[i % references.length] ? { reference: references[i % references.length] } : {}),
  demo: false,
  createdAt: new Date(sentAt.getTime() - (count - i) * 23 * 60_000 - 3600_000).toISOString(),
  photos: it.photos.length
    ? it.photos
    : Array.from({ length: lend[i % lend.length] ?? 0 }, (_, k) => ({
        src: `${PLACEHOLDER}${it.id}-${k + 1}`,
        takenAt: "",
        by: "",
      })),
}));

const doc = digestDocument(day, canoas, sentAt, 287);
const pdf = await renderPdf(doc, {
  muni: canoas,
  tiles: openFreeMap(fileURLToPath(new URL("../cache/", import.meta.url))),
  photos: async (url) => {
    if (url.startsWith(PLACEHOLDER)) return placeholder(url.slice(PLACEHOLDER.length));
    const file = `${media}${new URL(url).pathname.replace(/^\//, "")}`;
    return existsSync(file) ? new Uint8Array(readFileSync(file)) : null;
  },
  addressee: ADDRESSEE,
  sample: true,
  sentAt,
});
mkdirSync(out, { recursive: true });
writeFileSync(`${out}amostra-resumo.pdf`, pdf);
console.log(
  `${out}amostra-resumo.pdf · ${doc.total} registros, ${doc.sections.length} órgãos · ${(pdf.length / 1e6).toFixed(2)} MB`,
);

/** A grey 4:3 card that says it stands for a resident's photo: the sample's photos, never a real scene. */
async function placeholder(name: string): Promise<Uint8Array> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
<rect width="1200" height="900" fill="#E6E6E9"/>
<g fill="none" stroke="#B3B5BB" stroke-width="10"><rect x="470" y="330" width="260" height="190" rx="22"/><circle cx="600" cy="425" r="55"/></g>
<text x="600" y="610" font-family="sans-serif" font-size="44" fill="#5F626A" text-anchor="middle">foto do morador · exemplo</text>
<text x="600" y="670" font-family="monospace" font-size="34" fill="#8A8D94" text-anchor="middle">${name}</text></svg>`;
  return new Uint8Array(await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer());
}
