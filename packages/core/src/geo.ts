import type { AreaGeometry, LngLat, NeighborhoodCollection } from "./types";

export function haversine(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const t = Math.PI / 180;
  const dLa = (b[1] - a[1]) * t;
  const dLo = (b[0] - a[0]) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function polygonsOf(geom: AreaGeometry): number[][][][] {
  return geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
}

/** Even-odd ray casting over every ring, so holes are respected. */
export function pointInGeometry(pt: LngLat, geom: AreaGeometry): boolean {
  const [x, y] = pt;
  let inside = false;
  for (const poly of polygonsOf(geom)) {
    for (const ring of poly) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i]?.[0] ?? 0;
        const yi = ring[i]?.[1] ?? 0;
        const xj = ring[j]?.[0] ?? 0;
        const yj = ring[j]?.[1] ?? 0;
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
  }
  return inside;
}

/** Bairro slug at a point, using the instance's own polygons (no geocoder). */
export function neighborhoodAt(pt: LngLat, fc: NeighborhoodCollection): string | null {
  return fc.features.find((f) => pointInGeometry(pt, f.geometry))?.properties.slug ?? null;
}
