/**
 * `bun scripts/app-icons.ts`: the installable app's icons (DECISIONS round 11), drawn from the
 * favicon's mark (an ink square, the esmerald comma) into apps/web/public/icons. "any" icons keep the
 * rounded square on transparency; the maskable one and Apple's fill the square, with the comma inside
 * the 80% safe zone the platforms crop to.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { readFile, writeFile } from "node:fs/promises";

await initWasm(await readFile(Bun.resolveSync("@resvg/resvg-wasm/index_bg.wasm", import.meta.dir)));
const out = `${import.meta.dir}/../../web/public/icons`;

/** The comma, drawn on the favicon's 64-unit grid. */
const comma = `<circle cx="32" cy="27" r="9.5" fill="#16A975"/><path d="M38.6 33.2c.9 7.4-3.4 13.6-11.1 16.3l-1.6-3.6c4.6-2.2 6.8-5.3 6.6-9.6z" fill="#16A975"/>`;

/** Rounded, on transparency, as the favicon. */
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#0E0F10"/>${comma}</svg>`;

/** Full bleed, the comma scaled to sit in the middle 80%. */
const bleed = (scale: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0E0F10"/><g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${comma}</g></svg>`;

/** Android's status-bar badge: the comma alone, white on transparency (the system tints it). */
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="translate(32 32) scale(1.45) translate(-32 -32)">${comma.replaceAll("#16A975", "#FFFFFF")}</g></svg>`;

const icons: [string, string, number][] = [
  ["icon-192.png", rounded, 192],
  ["icon-512.png", rounded, 512],
  ["icon-maskable-512.png", bleed(0.8), 512],
  ["apple-touch-icon.png", bleed(0.9), 180],
  ["badge-96.png", badge, 96],
];

await Promise.all(
  icons.map(async ([name, svg, size]) => {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
    await writeFile(`${out}/${name}`, png);
    console.log(`${name} ${size}px ${(png.length / 1024).toFixed(1)} kB`);
  }),
);
