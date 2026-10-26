// The landing's hero figure: Canoas as a tabletop relief (Anatomy kit, MIT; ../kit). The municipal
// boundary is the plinth, the 18 official bairros are drawn on it at their true shapes, and each pin
// is a stack of discs, one per day open since the 18h resumo carried it; past the 30-day reference
// deadline the discs take the accent, as in the Placar. One pin (7K3QF, Niterói) is the tour: it drops,
// stacks a disc a day, and sinks into a resolved ring when two neighbours confirm the fix.
//
//   bun figures/canoas-relief/build.ts            writes src/features/landing/relief/art.generated.ts
//   bun figures/canoas-relief/build.ts --preview  also writes /tmp/canoas-relief-{light,dark}.html
//
// Every pin is fictional demo data (the fixtures), and the figure is labelled "exemplo" where it shows.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AreaGeometry } from "@fala/core";
import { canoas } from "@fala/instance-canoas";
import { fixtures } from "@fala/instance-canoas/fixtures";
// @ts-expect-error: the vendored kit is plain ESM without types.
import * as k from "../kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../../src/features/landing/relief/art.generated.ts");

const WIDTH = 640;
// The height follows the drawing: fitted to the width, then cropped to what the model covers.
const FIT_HEIGHT = 900;
const DEADLINE = canoas.deadlineDays;

// ---- Geography → world units ------------------------------------------------------------------------

type Ring = [number, number][];
const [lng0, lat0] = canoas.center;
const KM = 22; // world units per kilometre
const toWorld = ([lng, lat]: number[]): [number, number] => [
  ((lng ?? 0) - lng0) * Math.cos((lat0 * Math.PI) / 180) * 111.32 * KM,
  -((lat ?? 0) - lat0) * 110.57 * KM,
];
const ringsOf = (g: AreaGeometry): Ring[] => {
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.map((p) => (p[0] ?? []).map(toWorld));
};
/** Drops points closer than `min` to the last kept one: the outline stays true at this scale. */
const thin = (ring: Ring, min = 1.4): Ring => {
  const out: Ring = [];
  for (const p of ring) {
    const last = out.at(-1);
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= min) out.push(p);
  }
  return out;
};
/** Distance from p to the line through a and b (to a when they coincide). */
const off = (p: number[], a: number[], b: number[]) => {
  const [dx, dy] = [b[0]! - a[0]!, b[1]! - a[1]!];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return Math.hypot(p[0]! - a[0]!, p[1]! - a[1]!);
  return Math.abs(dx * (a[1]! - p[1]!) - dy * (a[0]! - p[0]!)) / len;
};
/** Distance from p to the segment a–b. */
const off2 = (p: number[], a: number[], b: number[]) => {
  const [dx, dy] = [b[0]! - a[0]!, b[1]! - a[1]!];
  const t = Math.max(0, Math.min(1, ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p[0]! - a[0]! - t * dx, p[1]! - a[1]! - t * dy);
};
/** A vertex's identity, for spotting the same border segment in two bairros. */
const key = (p: number[]) => `${p[0]!.toFixed(2)},${p[1]!.toFixed(2)}`;
/** Douglas-Peucker on a closed ring: drops vertices within `tol` of the line their neighbours make. */
function simplify(ring: Ring, tol: number): Ring {
  const pts = [...ring, ring[0]!];
  const keep: boolean[] = Array.from({ length: pts.length }, () => false);
  keep[0] = keep[pts.length - 1] = true;
  const todo: [number, number][] = [[0, pts.length - 1]];
  while (todo.length) {
    const [i, j] = todo.pop()!;
    let far = -1;
    let at = -1;
    for (let m = i + 1; m < j; m++) {
      const d = off(pts[m]!, pts[i]!, pts[j]!);
      if (d > far) [far, at] = [d, m];
    }
    if (far > tol) {
      keep[at] = true;
      todo.push([i, at], [at, j]);
    }
  }
  return pts.filter((_, m) => keep[m]).slice(0, -1);
}
/** Douglas-Peucker on an open run: its two ends stay where the borders meet. */
function simplifyOpen(run: Ring, tol: number): Ring {
  if (run.length < 3) return run;
  const closed = simplify(run, tol);
  // simplify() treats the run as a ring closed back to its start; an open run keeps both ends.
  const last = run.at(-1)!;
  return closed.at(-1) === last ? closed : [...closed, last];
}
// The city's edge, smoothed for the plinth's sides; the bairros keep their published shapes below.
const boundary = simplify(thin(ringsOf(canoas.geo.boundary.features[0]!.geometry)[0]!, 0.5), 3.4);
/** The bairros exactly as published, for borders shared vertex for vertex. */
const bairroSource = canoas.geo.neighborhoods.features.map((f) => ({
  slug: f.properties.slug,
  rings: ringsOf(f.geometry),
}));
/** The nearest point on the city's edge. */
const onEdge = ([x, y]: number[]): [number, number] => {
  let best: [number, number] = [x!, y!];
  let dist = Infinity;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x! - a[0]) * dx + (y! - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const q: [number, number] = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(x! - q[0], y! - q[1]);
    if (d < dist) [dist, best] = [d, q];
  }
  return best;
};
/** Distance from a point to the city's edge, to leave the outer bairro borders to the plinth's rim. */
const toEdge = ([x, y]: number[]) => {
  let best = Infinity;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x! - a[0]) * dx + (y! - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x! - a[0] - t * dx, y! - a[1] - t * dy));
  }
  return best;
};

// ---- Pins ----------------------------------------------------------------------------------------------

const TOUR_ID = "7K3QF";
const pointOf = (it: (typeof fixtures.items)[number]) =>
  it.scope.type === "point" ? toWorld([it.scope.lng, it.scope.lat]) : null;
const open = fixtures.items.filter((i) => i.scope.type === "point" && i.community !== "resolved");
// Most pins under the deadline, one in four past it: the accent marks what needs attention, not the city.
const PINS = canoas.neighborhoods
  .map((n, idx) =>
    open.find(
      (i) =>
        i.neighborhood === n.slug &&
        i.id !== TOUR_ID &&
        (idx % 4 === 0 ? i.days > DEADLINE + 8 && i.days <= 75 : i.days >= 6 && i.days <= DEADLINE - 4),
    ),
  )
  .filter((i) => i !== undefined)
  .map((i) => ({ id: i.id, at: pointOf(i)!, days: i.days }));
const RESOLVED = canoas.neighborhoods
  .filter((_, n) => n % 3 === 1)
  .map((n) =>
    fixtures.items.find((i) => i.neighborhood === n.slug && i.community === "resolved" && i.scope.type === "point"),
  )
  .filter((i) => i !== undefined)
  .map((i) => pointOf(i)!);
const tourItem = fixtures.items.find((i) => i.id === TOUR_ID)!;
const TOUR = { at: pointOf(tourItem)!, days: tourItem.days };

// ---- Dimensions ----------------------------------------------------------------------------------------

const BASE_H = 16;
const DISC = 1.15; // world units per day
const PIN_R = 2.6;
const TOUR_MAX = 46; // days of discs prebuilt for the tour pin (it shows up to its own count)

/** Whether a point lies inside a ring (even-odd). */
const inside = (ring: Ring, [x, y]: number[]) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y! !== yj > y! && x! < ((xj - xi) * (y! - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

const P = k.fitProjection(
  [
    ...boundary.map((p) => [p[0], p[1], -BASE_H - 4]),
    ...boundary.map((p) => [p[0], p[1], 0]),
    ...PINS.map((p) => [p.at[0], p.at[1], p.days * DISC + 3]),
    [TOUR.at[0], TOUR.at[1], TOUR_MAX * DISC + 6],
  ],
  WIDTH,
  FIT_HEIGHT,
  { pad: 14, azimuth: 38 },
);
const FIT_POINTS = [
  ...boundary.map((p) => [p[0], p[1], -BASE_H - 6]),
  ...PINS.map((p) => [p.at[0], p.at[1], p.days * DISC + 3]),
  [TOUR.at[0], TOUR.at[1], TOUR_MAX * DISC + 6],
].map((p) => k.iso(p, P)[1]);
const CROP = Math.min(...FIT_POINTS) - 10;
const HEIGHT = Math.ceil(Math.max(...FIT_POINTS) + 10 - CROP);
P.origin = [P.origin[0], P.origin[1] - CROP];

const at = (p: number[]) => k.iso(p, P);
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style);
const L = (d: string, style?: object) => k.lineSvg(d, style);
const depth = (p: number[]) => k.depthOf([p[0], p[1], 0], P);

// ---- Parts ----------------------------------------------------------------------------------------------

/**
 * The plinth: the city's boundary as a thick board. A concave outline can't be one hull, so each wall
 * facing the viewer is its own quad, painted far to near with its own bottom edge and seam, so a
 * nearer wall hides a farther one in every notch; the top face, painted last, covers what is behind
 * it, and its rim is the one outline the eye follows.
 */
function plinth() {
  const out = [`<path class="iso-halo" d="${k.extrude(boundary, -BASE_H - 3, 1, P, { convex: false }).fill}"/>`];
  const n = boundary.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = boundary[i]!;
    const [bx, by] = boundary[(i + 1) % n]!;
    area += ax * by - bx * ay;
  }
  const [vx, vy] = k.towardViewer(P);
  const { sinA, cosA } = k.cameraOf(P);
  const edges = boundary.map((a, i) => {
    const b = boundary[(i + 1) % n]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nrm = area > 0 ? [(b[1] - a[1]) / len, -(b[0] - a[0]) / len] : [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    return { a, b, nrm, facing: nrm[0]! * vx + nrm[1]! * vy > 1e-6 };
  });
  const z0 = -BASE_H;
  const seamZ = -BASE_H + 5;
  const walls = edges
    .map((e, i) => ({ ...e, i }))
    .filter((e) => e.facing)
    .map((e) => {
      const lit = (e.nrm[0]! * -sinA + e.nrm[1]! * cosA + 1) / 2;
      const shade = Math.min(3, Math.max(0, Math.floor(lit * 4)));
      const quad = k.pathOf([at([...e.a, 0]), at([...e.b, 0]), at([...e.b, z0]), at([...e.a, z0])], true);
      const lines = [k.pathOf([at([...e.a, z0]), at([...e.b, z0])])];
      // A vertical edge only where the wall turns away: the silhouette.
      const prev = edges[(e.i + n - 1) % n]!;
      const next = edges[(e.i + 1) % n]!;
      if (!prev.facing) lines.push(k.pathOf([at([...e.a, 0]), at([...e.a, z0])]));
      if (!next.facing) lines.push(k.pathOf([at([...e.b, 0]), at([...e.b, z0])]));
      // A seam where the plinth's two layers meet, and the chamfer just under the rim.
      const seam =
        k.pathOf([at([...e.a, seamZ]), at([...e.b, seamZ])]) + k.pathOf([at([...e.a, -1.4]), at([...e.b, -1.4])]);
      return {
        depth: k.depthOf([(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, z0 / 2], P),
        svg: `<path class="iso-shade" data-shade="${shade}" d="${quad}"/>${L(seam, { tone: "faint" })}${L(lines.join(""), { tone: "mid" })}`,
      };
    })
    .toSorted((p, q) => p.depth - q.depth);
  out.push(`<g class="rf-walls">${walls.map((w) => w.svg).join("")}</g>`);
  out.push(`<path class="iso-top" d="${TOP}"/>`);
  return out.join("");
}

/** The plinth's top face as a screen path: also the clip that keeps the borders and the wash on it. */
const TOP = k.pathOf(
  boundary.map((p) => at([...p, 0])),
  true,
);

// A run that stops near the edge (where the segments along it were left out) is carried onto it,
// a little past, so it ends on the rim and the clip trims it there.
const reach = (end: [number, number]): [number, number][] => {
  if (toEdge(end) > 9) return [end];
  const q = onEdge(end);
  // Out across the rim along its normal (whichever side is outside the city), never along it.
  const e = boundary.reduce(
    (best, a, i) => {
      const b = boundary[(i + 1) % boundary.length]!;
      const d = off2(q, a, b);
      return d < best.d ? { d, a, b } : best;
    },
    { d: Infinity, a: boundary[0]!, b: boundary[1]! },
  );
  const [tx, ty] = [e.b[0] - e.a[0], e.b[1] - e.a[1]];
  const tl = Math.hypot(tx, ty) || 1;
  let n = [ty / tl, -tx / tl];
  if (inside(boundary, [q[0] + n[0]! * 2, q[1] + n[1]! * 2])) n = [-n[0]!, -n[1]!];
  return inside(boundary, end) ? [end, q, [q[0] + n[0]! * 0.3, q[1] + n[1]! * 0.3]] : [q];
};

function bairroLines() {
  // The source rings, where two bairros share exactly the same vertices along a border: each
  // segment is drawn once. Segments running along the city's edge are left to the plinth's rim;
  // one reaching the edge from inside stays, so every inner border ends on the rim (the clip trims
  // what passes it).
  const seen = new Set<string>();
  const runs: Ring[] = [];
  for (const b of bairroSource) {
    for (const r of b.rings) {
      let run: Ring = [];
      const flush = () => {
        if (run.length > 1) runs.push(run);
        run = [];
      };
      for (let i = 0; i < r.length; i++) {
        const a = r[i]!;
        const c = r[(i + 1) % r.length]!;
        const id = [key(a), key(c)].toSorted().join("|");
        const along = toEdge([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]) < 3.4 && toEdge(a) < 3.4 && toEdge(c) < 3.4;
        if (seen.has(id) || key(a) === key(c) || along) {
          seen.add(id);
          flush();
          continue;
        }
        seen.add(id);
        if (!run.length) run.push(a);
        run.push(c);
      }
      flush();
    }
  }
  // Each border is now one run, so smoothing it can't split a shared border into two lines.
  // Split every run at the vertices where another run ends, so smoothing keeps each junction exact.
  const ends = new Set(runs.flatMap((r) => [key(r[0]!), key(r.at(-1)!)]));
  const pieces = runs.flatMap((run) => {
    const out: Ring[] = [];
    let cur: Ring = [run[0]!];
    for (let i = 1; i < run.length; i++) {
      cur.push(run[i]!);
      if (i < run.length - 1 && ends.has(key(run[i]!))) {
        out.push(cur);
        cur = [run[i]!];
      }
    }
    out.push(cur);
    return out.filter((r) => r.length > 1);
  });

  const d = pieces
    .map((run) => {
      const r = simplifyOpen(run, 0.8);
      if (r.length < 2) return "";
      const head = reach(r[0]!).toReversed();
      const tail = reach(r.at(-1)!);
      return k.pathOf([...head, ...r.slice(1, -1), ...tail].map((p) => at([p[0], p[1], 0])));
    })
    .join("");

  return `<g clip-path="url(#rf-top)">${L(d, { tone: "lo" })}</g>${L(TOP, { tone: "mid" })}`;
}

/** Where a point projects onto the city's edge, as a position along it (segment index + fraction). */
function edgeParam([x, y]: number[]) {
  let best = { at: 0, q: boundary[0]!, d: Infinity };
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i]!;
    const b = boundary[(i + 1) % boundary.length]!;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const t = Math.max(0, Math.min(1, ((x! - a[0]) * dx + (y! - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const q: [number, number] = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(x! - q[0], y! - q[1]);
    if (d < best.d) best = { at: i + t, q, d };
  }
  return best;
}
/** The city's edge between two positions along it, the shorter way round. */
function edgeBetween(from: number, to: number): Ring {
  const n = boundary.length;
  const ahead = (((to - from) % n) + n) % n;
  const pts: Ring = [];
  if (ahead <= n / 2) {
    // Forward: the vertices after `from`, up to and including the one before `to`.
    const steps = Math.floor(from + ahead) - Math.floor(from);
    for (let k2 = 1; k2 <= steps; k2++) pts.push(boundary[(Math.floor(from) + k2) % n]!);
  } else {
    // Backward: the vertex at `from`'s segment start, down to the one after `to`.
    const steps = Math.floor(from) - Math.floor(from - (n - ahead));
    for (let k2 = 0; k2 < steps; k2++) pts.push(boundary[(((Math.floor(from) - k2) % n) + n) % n]!);
  }
  return pts;
}
/**
 * A bairro's outline with its stretches along the city's edge replaced by the plinth's own edge, so
 * the panels tile the top exactly: the published bairros and the smoothed edge never quite agree,
 * and the gap would show as a pale sliver (or, painted over, as tint on a neighbour).
 */
function snapped(ring: Ring): Ring {
  const near = ring.map((p) => toEdge(p) < 5);
  if (near.every(Boolean) || !near.some(Boolean)) return ring;
  const n = ring.length;
  const startAt = near.findIndex((v, i) => !v && near[(i + 1) % n]); // a far vertex followed by a near one
  const out: Ring = [];
  for (let k2 = 1; k2 <= n; k2++) {
    const i = (startAt + k2) % n;
    if (!near[i]) {
      out.push(ring[i]!);
      continue;
    }
    // A run of near vertices: from its first to its last, follow the edge.
    let j = i;
    while (near[(j + 1) % n] && (j + 1) % n !== startAt) j = (j + 1) % n;
    const a = edgeParam(ring[i]!);
    const b = edgeParam(ring[j]!);
    out.push(a.q, ...edgeBetween(a.at, b.at), b.q);
    k2 += (j - i + n) % n;
  }
  return out;
}

/**
 * The bairros as panels of the model, each a whisper of tone apart, coloured so no two neighbours
 * share one (greedy colouring over the vertices they share): the 18 read at a glance.
 */
function bairroPanels() {
  const verts = bairroSource.map((b) => new Set(b.rings.flatMap((r) => r.map(key))));
  const touches = (i: number, j: number) => [...verts[i]!].some((v) => verts[j]!.has(v));
  const tone: number[] = [];
  bairroSource.forEach((_, i) => {
    const used = new Set(bairroSource.slice(0, i).flatMap((__, j) => (touches(i, j) ? [tone[j]] : [])));
    tone[i] = [0, 1, 2, 3].find((t) => !used.has(t)) ?? 0;
  });
  const d = (b: (typeof bairroSource)[number]) =>
    b.rings
      .map((r) =>
        k.pathOf(
          snapped(r).map((p) => at([p[0], p[1], 0])),
          true,
        ),
      )
      .join("");
  return `<g clip-path="url(#rf-top)">${bairroSource
    .map((b, i) => `<path class="rf-panel" data-tone="${tone[i]}" d="${d(b)}"/>`)
    .join("")}</g>`;
}

/** The tour's bairro, washed on the plinth's top (clipped to it) so the eye finds where the pin lives. */
function tourBairro() {
  const b = bairroSource.find((x) => x.slug === tourItem.neighborhood);
  if (!b) return "";
  const d = b.rings
    .map((r) =>
      k.pathOf(
        snapped(r).map((p) => at([p[0], p[1], 0])),
        true,
      ),
    )
    .join("");
  return `<clipPath id="rf-top"><path d="${TOP}"/></clipPath><path class="rf-home" clip-path="url(#rf-top)" d="${d}"/>`;
}

/** A pin standing for `days` days: discs to the deadline in ink, the rest in the accent. */
function stack([x, y]: number[], days: number) {
  const out = [];
  const below = Math.min(days, DEADLINE);
  out.push(S(k.cylinder(x, y, PIN_R + 1.2, 0, 0.8, P, 24, 0.3), { tone: "mid" }));
  out.push(
    `<g class="rf-pin">`,
    S(k.cylinder(x, y, PIN_R, 0.8, below * DISC, P, 24, 0.3), {
      tone: "mid",
      inner: L(
        Array.from({ length: Math.floor(below / 5) }, (_, i) =>
          k.sideArc(x, y, PIN_R, 0.8 + (i + 1) * 5 * DISC, P, 16),
        ).join(""),
        { tone: "faint" },
      ),
    }),
    `</g>`,
  );
  if (days > DEADLINE) {
    out.push(
      `<g class="rf-late">${S(k.cylinder(x, y, PIN_R, 0.8 + below * DISC, (days - DEADLINE) * DISC, P, 24, 0.3), { tone: "mid" })}</g>`,
    );
  }
  // The cap: a slightly wider disc finishing the stack, in the stack's own colour.
  const top = 0.8 + days * DISC;
  out.push(
    `<g class="${days > DEADLINE ? "rf-late" : "rf-pin"}">${S(k.cylinder(x, y, PIN_R + 0.45, top, 0.7, P, 24, 0.3), { tone: "mid" })}</g>`,
  );
  return out.join("");
}

function resolvedRing([x, y]: number[]) {
  return L(k.ring(x, y, PIN_R + 0.6, 0.05, P, 24), { tone: "mid" });
}

/**
 * The tour pin, built once at its tallest and revealed to the day: the column is clipped below a
 * moving plane (a tall cylinder silhouette that the live code slides along z), and a cap (the top
 * face of a disc) rides that plane. The accent takes over above the deadline, as on the other pins.
 */
function tourStack() {
  const [x, y] = TOUR.at;
  const out = [`<g data-part="seat">${S(k.cylinder(x, y, PIN_R + 1.2, 0, 0.8, P, 24, 0.3), { tone: "mid" })}</g>`];
  out.push(`<g data-part="ring" style="opacity:0">${resolvedRing(TOUR.at)}</g>`);
  const seams = (from: number, to: number) =>
    L(
      Array.from({ length: TOUR_MAX }, (_, d) => d)
        .filter((d) => d > from && d < to && d % 5 === 0)
        .map((d) => k.sideArc(x, y, PIN_R, 0.8 + d * DISC, P, 16))
        .join(""),
      { tone: "faint" },
    );
  const zDead = 0.8 + DEADLINE * DISC;
  const column =
    `<g class="rf-pin">${S(k.cylinder(x, y, PIN_R, 0.8, DEADLINE * DISC, P, 24, 0.3), { tone: "mid", inner: seams(0, DEADLINE) })}</g>` +
    `<g class="rf-late">${S(k.cylinder(x, y, PIN_R, zDead, (TOUR_MAX - DEADLINE) * DISC, P, 24, 0.3), { tone: "mid", inner: seams(DEADLINE, TOUR_MAX) })}</g>`;
  // The clip: everything at or below z = 0.8 (day 0), as a silhouette 400 units tall; slid up by days.
  // As wide as the cap's lip, so the column never shows past the cap that rides on top of it.
  const clip = k.cylinder(x, y, PIN_R + 0.45, 0.8 - 400, 400, P, 24).fill;
  out.push(`<clipPath id="rf-tour-clip"><path data-part="clip" d="${clip}"/></clipPath>`);
  out.push(`<g data-part="column" clip-path="url(#rf-tour-clip)">${column}</g>`);
  // Two caps sitting on the column at day 0 (the second in the accent), the same lip as the other
  // pins' caps; the live code rides them up with the days and shows one.
  const cap = (late: boolean) =>
    `<g data-part="${late ? "cap-late" : "cap"}" class="${late ? "rf-late" : "rf-pin"}"${late ? ' style="display:none"' : ""}>${S(k.cylinder(x, y, PIN_R + 0.45, 0.8, 0.7, P, 24, 0.3), { tone: "mid" })}</g>`;
  out.push(cap(false), cap(true));
  return out.join("");
}

// ---- Assemble --------------------------------------------------------------------------------------

const items: { depth: number; svg: string }[] = [
  ...PINS.map((p) => ({ depth: depth(p.at), svg: stack(p.at, p.days) })),
  ...RESOLVED.map((p) => ({ depth: depth(p) - 1000, svg: resolvedRing(p) })),
  { depth: depth(TOUR.at), svg: `<g data-part="tour">${tourStack()}</g>` },
].toSorted((a, b) => a.depth - b.depth);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "rf-svg",
  label:
    "Canoas em relevo, como exemplo: o limite do município é a base, os 18 bairros estão desenhados nos seus contornos reais, e cada registro é uma pilha de discos, um por dia em aberto desde o envio das 18h. Depois de 30 dias, os discos ficam verdes. Um registro em Niterói cresce dia a dia até dois vizinhos confirmarem o conserto.",
  body: [plinth(), bairroPanels(), tourBairro(), bairroLines(), ...items.map((i) => i.svg)],
});

const art = {
  width: WIDTH,
  height: HEIGHT,
  svg,
  tourMax: TOUR_MAX,
  deadline: DEADLINE,
  /** Screen offset of one day of height. */
  dayStep: k.axisVector(P, [0, 0, DISC]),
};
writeFileSync(
  OUT,
  `// Generated by figures/canoas-relief/build.ts (Anatomy kit, MIT). Do not edit: change the build and run it.\nexport const RELIEF_ART = ${JSON.stringify(art)};\n`,
);
console.log(`wrote ${OUT} (${(svg.length / 1024).toFixed(1)} KB of SVG, ${PINS.length} pins)`);

/** The preview pages show the tour pin at `days`, as the live code would. */
function previewAt(markup: string, days: number) {
  const [dx, dy] = k.axisVector(P, [0, 0, days * DISC]);
  const move = `transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})"`;
  return markup
    .replace('data-part="clip"', `data-part="clip" ${move}`)
    .replace(
      `data-part="cap-late" class="iso-solid rf-late" style="display:none"`,
      `data-part="cap-late" class="iso-solid rf-late" ${move}`,
    );
}

if (process.argv.includes("--preview")) {
  for (const theme of ["light", "dark"]) {
    const extra = `.rf-late{--anatomy-top:#0E845A;--anatomy-shade-0:#075E3F;--anatomy-shade-1:#096746;--anatomy-shade-2:#0A6F4C;--anatomy-shade-3:#0C7852;--anatomy-lit-top:#0E845A;--anatomy-lit-shade:#0A6F4C}.rf-home{fill:rgb(10 111 76/.10)}.rf-vote{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6}.rf-vote[data-on]{fill:var(--anatomy-lit)}.iso-line.rf-mark{stroke:#0A6F4C}.rf-panel{fill:#000;fill-opacity:0}.rf-panel[data-tone="1"]{fill-opacity:.018}.rf-panel[data-tone="2"]{fill-opacity:.034}.rf-panel[data-tone="3"]{fill-opacity:.05}`;
    const body = k.plateHtml({
      fig: "Fig 1",
      title: "Canoas em relevo",
      hint: "preview",
      readout: "7K3QF",
      body: `<div class="iso-stage">${previewAt(svg, TOUR.days)}</div>`,
    });
    writeFileSync(
      `/tmp/canoas-relief-${theme}.html`,
      k.pageHtml({ title: "Canoas em relevo", theme, body, width: 760 }).replace("</style>", `${extra}</style>`),
    );
  }
  console.log("wrote /tmp/canoas-relief-light.html and /tmp/canoas-relief-dark.html");
}
