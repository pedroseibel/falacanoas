/**
 * Web Mercator at zoom 14, in tile units (one tile = 1), the zoom OpenFreeMap's vector tiles stop
 * at. Maps for the PDF are drawn in this space and scaled to the page. Pure.
 */
export const Z = 14;
const N = 2 ** Z;

export type LngLat = [number, number];
export type Point = [number, number];

/** A box in tile units: x grows east, y grows south. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function toTile([lng, lat]: LngLat): Point {
  return [((lng + 180) / 360) * N, ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * N];
}

/** Metres covered by one tile unit at a latitude (east-west and north-south alike, in Mercator). */
export const metresPerUnit = (lat: number) => (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / N;

export function tilesIn(b: Box): Point[] {
  const out: Point[] = [];
  for (let y = Math.floor(b.y0); y <= Math.floor(b.y1); y++)
    for (let x = Math.floor(b.x0); x <= Math.floor(b.x1); x++) out.push([x, y]);
  return out;
}

export function boxAround(p: LngLat, w: number, h: number): Box {
  const [x, y] = toTile(p);
  const m = metresPerUnit(p[1]);
  return { x0: x - w / 2 / m, x1: x + w / 2 / m, y0: y - h / 2 / m, y1: y + h / 2 / m };
}

/**
 * The smallest box with the given width:height `aspect` that holds every point with a `pad` share of
 * margin around them, and is at least `minWidth` metres wide (one or two points still get context).
 */
export function fitBox(points: LngLat[], aspect: number, { minWidth, pad }: { minWidth: number; pad: number }): Box {
  const ts = points.map(toTile);
  const xs = ts.map((t) => t[0]);
  const ys = ts.map((t) => t[1]);
  const lat = points.reduce((s, p) => s + p[1], 0) / Math.max(1, points.length);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let w = (Math.max(...xs) - Math.min(...xs)) * (1 + 2 * pad);
  let h = (Math.max(...ys) - Math.min(...ys)) * (1 + 2 * pad);
  w = Math.max(w, minWidth / metresPerUnit(lat), h * aspect);
  h = w / aspect;
  return { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
}

/** Where a point falls in a box, as fractions of its width and height (0–1 inside). */
export function within(b: Box, [x, y]: Point): Point {
  return [(x - b.x0) / (b.x1 - b.x0), (y - b.y0) / (b.y1 - b.y0)];
}

/** Metres between two points (equirectangular: plenty inside a city). */
export function metres(a: LngLat, b: LngLat): number {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(lat);
  const dy = b[1] - a[1];
  return Math.hypot(dx, dy) * 111_320;
}
