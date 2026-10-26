import { VectorTile } from "@mapbox/vector-tile";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PbfReader } from "pbf";
import { Z } from "./geo";
import type { Fetcher } from "./photos";

/**
 * OpenFreeMap's vector tiles (OpenStreetMap data, OpenMapTiles schema), for the maps in the PDF. The
 * TileJSON names a versioned build whose tiles never change, so each tile is fetched once and kept on
 * disk: the whole of Canoas is about 60 tiles, 1.5 MB. No raster tile server is used (the OSM tile
 * policy forbids this kind of use), and no browser.
 */
const TILEJSON = "https://tiles.openfreemap.org/planet";
const USER_AGENT = "FalaCanoas-resumo/1.0 (+https://falacanoas.com.br)";
/** A week: a newer build only changes streets drawn since; tiles of the old one stay valid. */
const TILEJSON_MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export interface TileSource {
  get(x: number, y: number): Promise<VectorTile | null>;
}

export function openFreeMap(cacheDir: string, fetcher: Fetcher = fetch): TileSource {
  const headers = { "user-agent": USER_AGENT };
  let template: Promise<string | null> | null = null;

  async function tileUrl(): Promise<string | null> {
    const file = join(cacheDir, "tilejson.json");
    const fresh = existsSync(file) && Date.now() - statSync(file).mtimeMs < TILEJSON_MAX_AGE_MS;
    const cached = () => {
      if (!existsSync(file)) return null;
      const t: unknown = JSON.parse(readFileSync(file, "utf8"));
      return tilesOf(t);
    };
    if (fresh) return cached();
    try {
      const res = await fetcher(TILEJSON, { headers });
      if (!res.ok) return cached();
      const body = await res.text();
      const url = tilesOf(JSON.parse(body));
      if (!url) return cached();
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(file, body);
      return url;
    } catch {
      return cached();
    }
  }

  return {
    async get(x, y) {
      template ??= tileUrl();
      const url = await template;
      if (!url) return null;
      // The build's name is in the path (planet/20261011_080001_pt/{z}/{x}/{y}.pbf): one folder per build.
      const build = new URL(url.replace(/\{[zxy]\}/g, "0")).pathname.split("/").filter(Boolean)[1] ?? "build";
      const file = join(cacheDir, "tiles", build, String(Z), String(x), `${y}.pbf`);
      let bytes: Uint8Array | null = existsSync(file) ? new Uint8Array(readFileSync(file)) : null;
      // A dropped connection shouldn't cost a record its map: up to three tries, a moment apart.
      for (let attempt = 0; !bytes && attempt < 3; attempt++) {
        // oxlint-disable-next-line no-await-in-loop
        if (attempt) await Bun.sleep(400 * attempt);
        try {
          // oxlint-disable-next-line no-await-in-loop
          const res = await fetcher(url.replace("{z}", String(Z)).replace("{x}", String(x)).replace("{y}", String(y)), {
            headers,
          });
          // No tile there (nothing mapped): an empty one, not a failure.
          if (res.status === 404) return new VectorTile(new PbfReader(new Uint8Array()));
          if (!res.ok) continue;
          // oxlint-disable-next-line no-await-in-loop
          bytes = new Uint8Array(await res.arrayBuffer());
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, bytes);
        } catch {
          // try again
        }
      }
      if (!bytes) return null;
      return new VectorTile(new PbfReader(bytes));
    },
  };
}

function tilesOf(t: unknown): string | null {
  if (typeof t !== "object" || t === null || !("tiles" in t) || !Array.isArray(t.tiles)) return null;
  const first: unknown = t.tiles[0];
  return typeof first === "string" ? first : null;
}
