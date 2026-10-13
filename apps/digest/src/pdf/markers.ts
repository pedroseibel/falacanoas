import type { Point } from "./geo";

/**
 * Numbered markers on a printed map: a marker keeps its place when it can; when it would cover
 * another, it moves to the nearest free spot around its point and a leader line ties it back. The
 * number on the map is the report's number in the resumo, so the map and the list read together.
 * Pure: positions in map units in, positions out.
 */
export interface MarkerIn {
  n: number;
  at: Point;
}

export interface MarkerOut extends MarkerIn {
  /** Where the numbered disc goes. */
  label: Point;
  /** It had to move: draw a line from `at` to `label`. */
  moved: boolean;
}

/**
 * `radius` is the disc's radius and `width`/`height` the map's size, in the same units. Earlier
 * numbers are placed first. A marker with nowhere free within a few rings stays on its point.
 */
export function placeMarkers(markers: MarkerIn[], radius: number, width: number, height: number): MarkerOut[] {
  const gap = radius * 0.35;
  const placed: MarkerOut[] = [];
  const free = (p: Point) =>
    p[0] >= radius &&
    p[0] <= width - radius &&
    p[1] >= radius &&
    p[1] <= height - radius &&
    placed.every((o) => Math.hypot(o.label[0] - p[0], o.label[1] - p[1]) >= 2 * radius + gap);
  for (const m of markers.toSorted((a, b) => a.n - b.n)) {
    let label: Point | null = free(m.at) ? m.at : null;
    for (let ring = 1; !label && ring <= 6; ring++) {
      const r = ring * (2 * radius + gap);
      const steps = 8 * ring;
      for (let k = 0; k < steps && !label; k++) {
        // Start straight up, the way a pin's label usually sits, then go round.
        const a = -Math.PI / 2 + (k / steps) * 2 * Math.PI;
        const p: Point = [m.at[0] + r * Math.cos(a), m.at[1] + r * Math.sin(a)];
        if (free(p)) label = p;
      }
    }
    placed.push({ ...m, label: label ?? m.at, moved: label !== null && label !== m.at });
  }
  return placed;
}
