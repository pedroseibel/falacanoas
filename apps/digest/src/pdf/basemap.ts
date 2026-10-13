import type { Municipality } from "@fala/core";
import type { VectorTile } from "@mapbox/vector-tile";
import { metres, metresPerUnit, tilesIn, toTile, within, type Box, type LngLat, type Point } from "./geo";
import type { TileSource } from "./tiles";

/**
 * A map's ground for the PDF, as SVG: water, parks, streets and, on the city map, the bairros and the
 * municipal limit. Markers, numbers and street names are not drawn here: Typst sets them on top,
 * in the document's own type, so they stay text. Print colours, DESIGN.md's neutral scale; the orange
 * is the template's, for the place a page is about.
 */

const C = {
  outside: "#EFEFF1", // ground
  inside: "#FFFFFF", // panel
  street: "#F5F5F6", // panel-2, the street map's ground
  water: "#D9DFE4",
  park: "#E7EBE4",
  building: "#E4E4E7",
  casing: "#C9CACE",
  road: "#FFFFFF",
  major: "#8D9096",
  mid: "#B4B6BA",
  minor: "#D6D7DA",
  bairro: "#5F626A", // ink-3
  limit: "#0E0F10", // ink
};

export interface StreetLabel {
  name: string;
  /** Fractions of the map's width and height. */
  at: Point;
  /** Degrees, kept between -90 and 90 so the name never reads upside down. */
  angle: number;
}

export interface Basemap {
  svg: string;
  box: Box;
  /** Where a point falls, as fractions of the map's width and height. */
  at(p: LngLat): Point;
  /** How many metres the map's width covers (the scale bar). */
  widthMetres: number;
  /** Street names to set on a street map, nearest the focus first. */
  labels: StreetLabel[];
  /** The named street nearest the focus, and how far it is. */
  nearest: { name: string; metres: number } | null;
}

type Ring = Point[];
interface Line {
  name: string;
  points: Point[];
}

type RoadClass = "major" | "mid" | "minor" | "path";
/** Thin to thick, so major roads are drawn last, on top. */
const ROAD_ORDER: RoadClass[] = ["path", "minor", "mid", "major"];
const ROADS: Record<string, RoadClass> = {
  motorway: "major",
  trunk: "major",
  primary: "major",
  secondary: "mid",
  tertiary: "mid",
  minor: "minor",
  service: "minor",
  track: "path",
  path: "path",
};

/** A GeoJSON layer's rings, in tile units. */
const polygons = (fc: Municipality["geo"]["boundary"] | Municipality["geo"]["neighborhoods"]): Ring[] =>
  fc.features.flatMap((f) =>
    (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flatMap((poly) =>
      poly.map((ring) => ring.map(([lng, lat]) => toTile([lng ?? 0, lat ?? 0]))),
    ),
  );

export async function drawBasemap(
  tiles: TileSource,
  box: Box,
  opts: { muni: Municipality; detail: "city" | "street"; width: number; focus?: LngLat },
): Promise<Basemap> {
  const W = opts.width;
  const H = (W * (box.y1 - box.y0)) / (box.x1 - box.x0);
  const sx = (x: number) => ((x - box.x0) / (box.x1 - box.x0)) * W;
  const sy = (y: number) => ((y - box.y0) / (box.y1 - box.y0)) * H;
  const margin = (box.x1 - box.x0) * 0.05;
  const touches = (r: Ring) =>
    r.some(([x, y]) => x > box.x0 - margin && x < box.x1 + margin && y > box.y0 - margin && y < box.y1 + margin);
  const d = (rings: Ring[], close: boolean) =>
    rings
      .filter(touches)
      .map((r) => `M${r.map(([x, y]) => `${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`).join("L")}${close ? "Z" : ""}`)
      .join("");

  const water: Ring[] = [];
  const parks: Ring[] = [];
  const buildings: Ring[] = [];
  const roads: Record<RoadClass, Ring[]> = { major: [], mid: [], minor: [], path: [] };
  const names: Line[] = [];
  const street = opts.detail === "street";

  const loaded = await Promise.all(tilesIn(box).map(async ([x, y]) => ({ x, y, tile: await tiles.get(x, y) })));
  for (const { x, y, tile } of loaded) {
    if (!tile) continue;
    each(tile, "water", x, y, (f, rings) => f === 3 && water.push(...rings));
    each(tile, "park", x, y, (f, rings) => f === 3 && parks.push(...rings));
    each(tile, "landuse", x, y, (f, rings, p) => {
      if (f === 3 && ["park", "pitch", "cemetery", "grass", "playground"].includes(String(p.class)))
        parks.push(...rings);
    });
    if (street) each(tile, "building", x, y, (f, rings) => f === 3 && buildings.push(...rings));
    each(tile, "transportation", x, y, (f, rings, p) => {
      const bucket = ROADS[String(p.class)];
      if (f === 2 && bucket && (street || bucket !== "path")) roads[bucket].push(...rings);
    });
    if (street)
      each(tile, "transportation_name", x, y, (f, rings, p) => {
        if (f === 2 && typeof p.name === "string" && p.name)
          for (const r of rings) names.push({ name: p.name, points: r });
      });
  }

  const parts: string[] = [];
  const path = (rings: Ring[], close: boolean, attrs: string) => {
    const data = d(rings, close);
    if (data) parts.push(`<path d="${data}" ${attrs}/>`);
  };
  if (street) {
    parts.push(`<rect width="${W}" height="${H.toFixed(1)}" fill="${C.street}"/>`);
    path(parks, true, `fill="${C.park}"`);
    path(water, true, `fill="${C.water}" fill-rule="evenodd"`);
    path(buildings, true, `fill="${C.building}"`);
    const widths: Record<RoadClass, number> = { major: 11, mid: 9, minor: 6.5, path: 2 };
    for (const k of ROAD_ORDER)
      path(
        roads[k],
        false,
        `fill="none" stroke="${C.casing}" stroke-width="${widths[k] + 1.6}" stroke-linecap="round" stroke-linejoin="round"`,
      );
    for (const k of ROAD_ORDER)
      path(
        roads[k],
        false,
        `fill="none" stroke="${C.road}" stroke-width="${widths[k]}" stroke-linecap="round" stroke-linejoin="round"`,
      );
  } else {
    const limit = polygons(opts.muni.geo.boundary);
    parts.push(`<rect width="${W}" height="${H.toFixed(1)}" fill="${C.outside}"/>`);
    path(limit, true, `fill="${C.inside}" fill-rule="evenodd"`);
    path(parks, true, `fill="${C.park}"`);
    path(water, true, `fill="${C.water}" fill-rule="evenodd"`);
    path(roads.minor, false, `fill="none" stroke="${C.minor}" stroke-width=".6"`);
    path(roads.mid, false, `fill="none" stroke="${C.mid}" stroke-width="1.1"`);
    path(roads.major, false, `fill="none" stroke="${C.major}" stroke-width="2"`);
    path(
      polygons(opts.muni.geo.neighborhoods),
      true,
      `fill="none" stroke="${C.bairro}" stroke-width=".9" stroke-dasharray="4 3"`,
    );
    path(limit, true, `fill="none" stroke="${C.limit}" stroke-width="2"`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H.toFixed(1)}" width="${W}" height="${H.toFixed(1)}">${parts.join("")}</svg>`;
  const centre = (box.y0 + box.y1) / 2;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * centre) / 2 ** 14))) * 180) / Math.PI;
  const focus = opts.focus;
  return {
    svg,
    box,
    at: (p) => within(box, toTile(p)),
    widthMetres: (box.x1 - box.x0) * metresPerUnit(lat),
    labels: focus ? streetLabels(names, box, focus) : [],
    nearest: focus ? nearestStreet(names, focus) : null,
  };
}

/** Calls `f` with each feature's type, its rings in tile units, and its properties. */
function each(
  tile: VectorTile,
  layer: string,
  tx: number,
  ty: number,
  f: (type: number, rings: Ring[], props: Record<string, unknown>) => unknown,
) {
  const l = tile.layers[layer];
  if (!l) return;
  for (let i = 0; i < l.length; i++) {
    const feature = l.feature(i);
    const e = feature.extent;
    f(
      feature.type,
      feature.loadGeometry().map((r) => r.map((p): Point => [tx + p.x / e, ty + p.y / e])),
      feature.properties,
    );
  }
}

/** The closest point of a polyline to `p`, with the segment's angle there. */
function closest(points: Point[], p: Point): { at: Point; d: number; angle: number } | null {
  let best: { at: Point; d: number; angle: number } | null = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
    const at: Point = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(at[0] - p[0], at[1] - p[1]);
    if (!best || d < best.d) best = { at, d, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  }
  return best;
}

const upright = (deg: number) => (deg > 90 ? deg - 180 : deg < -90 ? deg + 180 : deg);

/**
 * Up to three street names, nearest streets first. Each sits on its own street, as close to the pin
 * as it can without covering it: the street the pin is on gets its name right beside it.
 */
export function streetLabels(lines: Line[], box: Box, focus: LngLat): StreetLabel[] {
  const p = toTile(focus);
  const step = (box.x1 - box.x0) / 60;
  const best = new Map<string, { label: StreetLabel; score: number }>();
  const near = new Map<string, number>();
  for (const l of lines) {
    near.set(l.name, Math.min(near.get(l.name) ?? Infinity, closest(l.points, p)?.d ?? Infinity));
    for (let i = 1; i < l.points.length; i++) {
      const a = l.points[i - 1];
      const b = l.points[i];
      if (!a || !b) continue;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const angle = upright((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
      for (let t = 0; t <= len; t += step) {
        const at = within(box, [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len]);
        // Inside the frame with room for the text, and off the pin.
        if (at[0] < 0.16 || at[0] > 0.84 || at[1] < 0.12 || at[1] > 0.88) continue;
        const score = Math.hypot(at[0] - 0.5, at[1] - 0.5);
        if (score < 0.13) continue;
        const prev = best.get(l.name);
        if (!prev || score < prev.score) best.set(l.name, { label: { name: l.name, at, angle }, score });
      }
    }
  }
  const out: StreetLabel[] = [];
  const proximity = (l: StreetLabel) => near.get(l.name) ?? Infinity;
  for (const { label } of [...best.values()].toSorted((x, y) => proximity(x.label) - proximity(y.label))) {
    if (out.some((o) => Math.hypot(o.at[0] - label.at[0], o.at[1] - label.at[1]) < 0.2)) continue;
    out.push(label);
    if (out.length === 3) break;
  }
  return out;
}

/** The named street nearest a point, in metres; none past 80 m, where "near" stops helping. */
export function nearestStreet(lines: Line[], focus: LngLat): { name: string; metres: number } | null {
  const p = toTile(focus);
  let best: { name: string; d: number; at: Point } | null = null;
  for (const l of lines) {
    const c = closest(l.points, p);
    if (c && (!best || c.d < best.d)) best = { name: l.name, d: c.d, at: c.at };
  }
  if (!best) return null;
  const n = 2 ** 14;
  const lng = (best.at[0] / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * best.at[1]) / n))) * 180) / Math.PI;
  const m = metres(focus, [lng, lat]);
  return m <= 80 ? { name: best.name, metres: Math.round(m) } : null;
}
