import type { DigestDocument, Municipality } from "@fala/core";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { drawBasemap, type Basemap } from "./basemap";
import { boxAround, fitBox, toTile, type LngLat } from "./geo";
import { placeMarkers } from "./markers";
import { photoWidth, printPhoto, type PhotoSource } from "./photos";
import { qrSvg } from "./qr";
import {
  markerFractions,
  scaleBar,
  templateData,
  type Addressee,
  type EntryAssets,
  type MapAsset,
} from "./template-data";
import type { TileSource } from "./tiles";
import { TYPST_BIN } from "./typst-release";

/**
 * The resumo as a PDF: maps, photos and QR codes written to a build folder, the data beside them,
 * then Typst. Tagged PDF/A-2a and PDF/UA-1: an archival record that a screen reader can read, with
 * bookmarks for each body and each report. Typst refuses to build a file that breaks either.
 */

const TEMPLATE = fileURLToPath(new URL("../../pdf/resumo.typ", import.meta.url));
const FONTS = fileURLToPath(new URL("../../fonts", import.meta.url));

/** Numbers on the city map only while they can still be read; past that, dots, numbered per body. */
const NUMBERED_ON_OVERVIEW = 60;
/** A body's own map, from this many located reports. */
const SECTION_MAP_FROM = 4;
/** Map units across: the SVG's coordinate width (the page scales it). */
const MAP_W = 1200;
const LOCATOR_W = 760;

export interface RenderOptions {
  muni: Municipality;
  tiles: TileSource;
  photos: PhotoSource;
  addressee: Addressee;
  /** Fictional data (the sample): labelled on every page. */
  sample?: boolean;
  /** The send's time: the PDF's creation date, so the same resumo builds the same file. */
  sentAt: Date;
}

/**
 * Typst over a template and its data.json in `dir`, with the bundled fonts only, as tagged PDF/A-2a and
 * PDF/UA-1. `createdAt` is the file's creation date, so the same input builds the same file.
 */
export async function compileTypst(dir: string, template: string, data: unknown, createdAt: Date): Promise<Uint8Array> {
  writeFileSync(join(dir, "data.json"), JSON.stringify(data));
  copyFileSync(template, join(dir, "doc.typ"));
  const run = Bun.spawn(
    [
      TYPST_BIN,
      "compile",
      "--root",
      dir,
      "--ignore-system-fonts",
      "--font-path",
      FONTS,
      "--pdf-standard",
      "a-2a,ua-1",
      "--creation-timestamp",
      String(Math.floor(createdAt.getTime() / 1000)),
      join(dir, "doc.typ"),
      join(dir, "doc.pdf"),
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [code, err] = await Promise.all([run.exited, new Response(run.stderr).text()]);
  if (code !== 0) throw new Error(`Typst não gerou o PDF:\n${err}`);
  return new Uint8Array(readFileSync(join(dir, "doc.pdf")));
}

/** Runs `f` over `items`, `n` at a time. */
async function pool<T, R>(items: T[], n: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = Array.from({ length: items.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        const item = items[i];
        // oxlint-disable-next-line no-await-in-loop
        if (item !== undefined) out[i] = await f(item);
      }
    }),
  );
  return out;
}

function mapAsset(
  base: Basemap,
  file: string,
  points: { n: number; at: LngLat }[],
  radius: number,
  width: number,
): MapAsset {
  const aspect = (base.box.x1 - base.box.x0) / (base.box.y1 - base.box.y0);
  const height = width / aspect;
  const inMap = points.map((p) => {
    const [fx, fy] = base.at(p.at);
    return { n: p.n, at: [fx * width, fy * height] satisfies [number, number] };
  });
  return {
    svg: file,
    aspect,
    markers: radius > 0 ? markerFractions(placeMarkers(inMap, radius, width, height), width, height) : [],
    numbered: radius > 0,
    labels: base.labels.map((l) => ({ name: l.name, x: l.at[0], y: l.at[1], angle: l.angle })),
    scale: scaleBar(base.widthMetres),
  };
}

/** The municipal limit's corners, for the city map's frame. */
function limitPoints(muni: Municipality): LngLat[] {
  return muni.geo.boundary.features.flatMap((f) =>
    (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flatMap((poly) =>
      poly.flatMap((ring) => ring.map(([lng, lat]): LngLat => [lng ?? 0, lat ?? 0])),
    ),
  );
}

export async function assemble(doc: DigestDocument, dir: string, opts: RenderOptions) {
  mkdirSync(join(dir, "maps"), { recursive: true });
  mkdirSync(join(dir, "photos"), { recursive: true });
  mkdirSync(join(dir, "qr"), { recursive: true });
  const entries = doc.sections.flatMap((s) => s.entries);
  const located = entries.flatMap((e) =>
    e.point ? [{ n: e.n, at: [e.point.lng, e.point.lat] satisfies LngLat }] : [],
  );

  // The whole city, every report on it.
  const city = limitPoints(opts.muni);
  const cityTiles = city.map(toTile);
  const natural =
    (Math.max(...cityTiles.map((t) => t[0])) - Math.min(...cityTiles.map((t) => t[0]))) /
    (Math.max(...cityTiles.map((t) => t[1])) - Math.min(...cityTiles.map((t) => t[1])));
  const cityBase = await drawBasemap(opts.tiles, fitBox(city, natural, { minWidth: 0, pad: 0.02 }), {
    muni: opts.muni,
    detail: "city",
    width: MAP_W,
  });
  writeFileSync(join(dir, "maps/overview.svg"), cityBase.svg);
  const numbered = located.length <= NUMBERED_ON_OVERVIEW;
  const overview = mapAsset(cityBase, "maps/overview.svg", located, numbered ? 15 : 0, MAP_W);
  // Past the limit: plain dots, still placed where each report is.
  if (!numbered)
    overview.markers = located.map((p) => {
      const [x, y] = cityBase.at(p.at);
      return { n: p.n, x, y, lx: x, ly: y, moved: false };
    });

  // Each body's reports, framed to fit them, from four up: fewer read fine from their own street maps,
  // and a small body's section then fits its first page.
  const sections = await Promise.all(
    doc.sections.map(async (s, i) => {
      const pts = s.entries.flatMap((e) =>
        e.point ? [{ n: e.n, at: [e.point.lng, e.point.lat] satisfies LngLat }] : [],
      );
      if (pts.length < SECTION_MAP_FROM) return null;
      const base = await drawBasemap(
        opts.tiles,
        fitBox(
          pts.map((p) => p.at),
          2.5,
          { minWidth: 1600, pad: 0.12 },
        ),
        {
          muni: opts.muni,
          detail: "city",
          width: MAP_W,
        },
      );
      const file = `maps/section-${i}.svg`;
      writeFileSync(join(dir, file), base.svg);
      return mapAsset(base, file, pts, 15, MAP_W);
    }),
  );

  // Per report: the street map, the QR code and the photos.
  const totalPhotos = entries.reduce((n, e) => n + e.photos.length, 0);
  const assets = new Map<string, EntryAssets>();
  await pool(entries, 6, async (e) => {
    const qr = `qr/${e.id}.svg`;
    writeFileSync(join(dir, qr), qrSvg(e.url));
    let locator: MapAsset | null = null;
    let street: EntryAssets["street"] = null;
    if (e.point) {
      const focus: LngLat = [e.point.lng, e.point.lat];
      const base = await drawBasemap(opts.tiles, boxAround(focus, 360, 216), {
        muni: opts.muni,
        detail: "street",
        width: LOCATOR_W,
        focus,
      });
      const file = `maps/r-${e.id}.svg`;
      writeFileSync(join(dir, file), base.svg);
      locator = mapAsset(base, file, [], 0, LOCATOR_W);
      street = base.nearest;
    }
    const width = photoWidth(totalPhotos);
    const photos: EntryAssets["photos"] = [];
    for (const [k, url] of e.photos.entries()) {
      // oxlint-disable-next-line no-await-in-loop
      const raw = await opts.photos(url);
      // oxlint-disable-next-line no-await-in-loop
      const jpeg = raw ? await printPhoto(raw, width) : null;
      if (!jpeg) continue;
      const file = `photos/${e.id}-${k + 1}.jpg`;
      writeFileSync(join(dir, file), jpeg);
      photos.push({ file, alt: `Foto ${k + 1} de ${e.photos.length} do registro ${e.id}, enviada por um morador` });
    }
    assets.set(e.id, { locator, street, qr, photos, missingPhotos: e.photos.length - photos.length });
  });

  return templateData(
    doc,
    { overview, sections, entries: assets },
    { addressee: opts.addressee, sample: Boolean(opts.sample) },
  );
}

export async function renderPdf(doc: DigestDocument, opts: RenderOptions): Promise<Uint8Array> {
  const dir = mkdtempSync(join(tmpdir(), "resumo-"));
  try {
    const data = await assemble(doc, dir, opts);
    return await compileTypst(dir, TEMPLATE, data, opts.sentAt);
  } finally {
    if (!process.env.RESUMO_KEEP_BUILD) rmSync(dir, { recursive: true, force: true });
    else console.log(`Pasta de montagem mantida: ${dir}`);
  }
}
