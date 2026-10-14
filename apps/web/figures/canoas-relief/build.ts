// The landing's hero figure: Canoas as a tabletop relief (Anatomy kit, MIT; ../kit). The municipal
// boundary is the plinth, the 18 official bairros are drawn on it at their true shapes, and each pin
// is a stack of discs, one per day open since the 18h resumo carried it; past the 30-day reference
// deadline the discs are orange, as in the Placar. One pin (7K3QF, Niterói) is the tour: it drops,
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
const boundary = thin(ringsOf(canoas.geo.boundary.features[0]!.geometry)[0]!, 4.2);
const bairros = canoas.geo.neighborhoods.features.map((f) => ({
  slug: f.properties.slug,
  rings: ringsOf(f.geometry).map((r) => thin(r, 3)),
}));

// ---- Pins ----------------------------------------------------------------------------------------------

const TOUR_ID = "7K3QF";
const pointOf = (it: (typeof fixtures.items)[number]) =>
  it.scope.type === "point" ? toWorld([it.scope.lng, it.scope.lat]) : null;
const open = fixtures.items.filter((i) => i.scope.type === "point" && i.community !== "resolved");
// Most pins under the deadline, one in four past it: the orange marks what needs attention, not the city.
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

const xs = boundary.map((p) => p[0]);
const ys = boundary.map((p) => p[1]);
const bbox = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
// The day gauge stands on the plinth's front-right corner region, outside the city.
const GAUGE = { x: bbox.x1 + 14, y: bbox.y0 + 40, w: 8, d: 8, r: 1.5 };
const GAUGE_DAYS = 45;

const P = k.fitProjection(
  [
    ...boundary.map((p) => [p[0], p[1], -BASE_H - 3]),
    ...boundary.map((p) => [p[0], p[1], 0]),
    ...PINS.map((p) => [p.at[0], p.at[1], p.days * DISC + 3]),
    [TOUR.at[0], TOUR.at[1], TOUR_MAX * DISC + 6],
    [GAUGE.x, GAUGE.y, GAUGE_DAYS * DISC + 4],
  ],
  WIDTH,
  FIT_HEIGHT,
  { pad: 22, azimuth: 38 },
);
const FIT_POINTS = [
  ...boundary.map((p) => [p[0], p[1], -BASE_H - 3]),
  ...PINS.map((p) => [p.at[0], p.at[1], p.days * DISC + 3]),
  [TOUR.at[0], TOUR.at[1], TOUR_MAX * DISC + 6],
  [GAUGE.x, GAUGE.y, GAUGE_DAYS * DISC + 4],
].map((p) => k.iso(p, P)[1]);
const TOP = Math.min(...FIT_POINTS) - 12;
const HEIGHT = Math.ceil(Math.max(...FIT_POINTS) + 16 - TOP);
P.origin = [P.origin[0], P.origin[1] - TOP];

const at = (p: number[]) => k.iso(p, P);
const S = (paths: unknown, style?: object) => k.solidSvg(paths, style);
const L = (d: string, style?: object) => k.lineSvg(d, style);
const D = (points: number[][], style?: object) => k.dotsSvg(points, style);
const depth = (p: number[]) => k.depthOf([p[0], p[1], 0], P);

// ---- Parts ----------------------------------------------------------------------------------------------

function plinth() {
  const out = [];
  const base = k.extrude(boundary, -BASE_H, BASE_H, P, { convex: false, bevel: 0.8 });
  out.push(`<path class="iso-halo" d="${k.extrude(boundary, -BASE_H - 2, 1, P, { convex: false }).fill}"/>`);
  out.push(S(base, { tone: "mid" }));
  // A seam a third of the way up the plinth's sides: the board the model is mounted on.
  out.push(L(k.ringSeam(boundary, -BASE_H + 5, P), { tone: "faint" }));
  return out.join("");
}

function bairroLines() {
  // Shared borders are drawn twice (once per bairro); the lo tone keeps the doubles invisible.
  const d = bairros.flatMap((b) => b.rings.map((r) => k.onTop(r, 0, P, true))).join("");
  return L(d, { tone: "lo" });
}

/** The tour's bairro, lit underneath its outline so the eye finds where the pin lives. */
function tourBairro() {
  const b = bairros.find((x) => x.slug === tourItem.neighborhood);
  if (!b) return "";
  return b.rings
    .map(
      (r) =>
        `<path class="rf-home" d="${k.pathOf(
          r.map((p) => at([p[0], p[1], 0])),
          true,
        )}"/>`,
    )
    .join("");
}

/** A pin standing for `days` days: discs to the deadline in ink, the rest in the accent. */
function stack([x, y]: number[], days: number) {
  const out = [];
  const below = Math.min(days, DEADLINE);
  out.push(S(k.cylinder(x, y, PIN_R + 1.2, 0, 0.8, P, 24), { tone: "lo" }));
  out.push(
    S(k.cylinder(x, y, PIN_R, 0.8, below * DISC, P, 24, 0.3), {
      tone: "hi",
      inner: L(
        Array.from({ length: Math.floor(below / 5) }, (_, i) =>
          k.sideArc(x, y, PIN_R, 0.8 + (i + 1) * 5 * DISC, P, 16),
        ).join(""),
        { tone: "faint" },
      ),
    }),
  );
  if (days > DEADLINE) {
    out.push(
      `<g class="rf-late">${S(k.cylinder(x, y, PIN_R, 0.8 + below * DISC, (days - DEADLINE) * DISC, P, 24, 0.3), { tone: "hi" })}</g>`,
    );
  }
  return out.join("");
}

function resolvedRing([x, y]: number[]) {
  return L(k.ring(x, y, PIN_R + 0.6, 0.05, P, 24), { tone: "mid" });
}

/**
 * The tour pin, built once at its tallest and revealed to the day: the column is clipped below a
 * moving plane (a tall cylinder silhouette that the live code slides along z), and a cap (the top
 * face of a disc) rides that plane. Orange takes over above the deadline, as on the other pins.
 */
function tourStack() {
  const [x, y] = TOUR.at;
  const out = [`<g data-part="seat">${S(k.cylinder(x, y, PIN_R + 1.2, 0, 0.8, P, 24), { tone: "lo" })}</g>`];
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
    S(k.cylinder(x, y, PIN_R, 0.8, DEADLINE * DISC, P, 24, 0.3), { tone: "hi", inner: seams(0, DEADLINE) }) +
    `<g class="rf-late">${S(k.cylinder(x, y, PIN_R, zDead, (TOUR_MAX - DEADLINE) * DISC, P, 24, 0.3), { tone: "hi", inner: seams(DEADLINE, TOUR_MAX) })}</g>`;
  // The clip: everything at or below z = 0.8 (day 0), as a silhouette 400 units tall; slid up by days.
  const clip = k.cylinder(x, y, PIN_R + 0.6, 0.8 - 400, 400, P, 24).fill;
  out.push(`<clipPath id="rf-tour-clip"><path data-part="clip" d="${clip}"/></clipPath>`);
  out.push(`<g clip-path="url(#rf-tour-clip)">${column}</g>`);
  // Two caps at day 0, the second in the accent; the live code moves both and shows one.
  const cap = (late: boolean) => {
    const c = k.cylinder(x, y, PIN_R, 0.8 - 0.01, 0.01, P, 24);
    return `<g data-part="${late ? "cap-late" : "cap"}" class="iso-solid${late ? " rf-late" : ""}" style="display:none"><path class="iso-top" d="${c.top}"/><path class="iso-line" data-tone="mid" d="${c.outline}"/></g>`;
  };
  out.push(cap(false), cap(true));
  // The two neighbours: lamps on the seat's rim that light as each confirms.
  for (const i of [0, 1]) {
    const a = -0.35 + i * 0.7 + Math.PI * 0.5;
    const [cx, cy] = at([x + Math.cos(a) * 6.4, y + Math.sin(a) * 6.4, 0]);
    out.push(`<circle data-part="vote-${i}" class="rf-vote" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.5"/>`);
  }
  return out.join("");
}

function gauge() {
  const out = [];
  const { x, y, w, d } = GAUGE;
  out.push(
    `<path class="iso-halo" d="${k.haloOf({ x: x - 5, y: y - 5, w: w + 10, d: d + 10, r: 3 }, -BASE_H, 2, P)}"/>`,
  );
  out.push(
    S(k.slabOf({ x: x - 5, y: y - 5, w: w + 10, d: d + 10, r: 3 }, -BASE_H, BASE_H + 2, P, 3, 0.5), { tone: "mid" }),
  );
  out.push(
    D(
      k.corners({ x: x - 5, y: y - 5, w: w + 10, d: d + 10, r: 3 }, 2).map(([px, py]: number[]) => at([px, py, 2])),
      { size: 0.45 },
    ),
  );
  out.push(S(k.slabOf(GAUGE, 2, GAUGE_DAYS * DISC, P, 3, 0.4), { tone: "mid" }));
  const face = y + d; // the +y face, toward the viewer
  const top = 2 + GAUGE_DAYS * DISC;
  const minor = [];
  const major = [];
  for (let day = 0; day <= GAUGE_DAYS; day += 5) {
    const z = 0.8 + day * DISC;
    if (z > top) break;
    const len = day % 10 === 0 ? 3.2 : 1.8;
    (day % 10 === 0 ? major : minor).push(k.segment([x + w, face, z], [x + w - len, face, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  const zDead = 0.8 + DEADLINE * DISC;
  out.push(
    L(k.segment([x + w, face, zDead], [x, face, zDead], P), { tone: "hi" }).replace(
      'class="iso-line"',
      'class="iso-line rf-mark"',
    ),
  );
  out.push(S(k.slabOf({ x: x - 0.6, y: y - 0.6, w: w + 1.2, d: d + 1.2, r: 1.8 }, top, 1.2, P, 3), { tone: "mid" }));
  out.push(D([at([x + w / 2, y + d / 2, top + 1.2])], { size: 0.5 }));
  return out.join("");
}

// ---- Assemble --------------------------------------------------------------------------------------

const items: { depth: number; svg: string }[] = [
  ...PINS.map((p) => ({ depth: depth(p.at), svg: stack(p.at, p.days) })),
  ...RESOLVED.map((p) => ({ depth: depth(p) - 1000, svg: resolvedRing(p) })),
  { depth: depth(TOUR.at), svg: `<g data-part="tour">${tourStack()}</g>` },
  { depth: depth([GAUGE.x + 4, GAUGE.y + 4]), svg: gauge() },
].toSorted((a, b) => a.depth - b.depth);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  className: "rf-svg",
  label:
    "Canoas em relevo, como exemplo: o limite do município é a base, os 18 bairros estão desenhados nos seus contornos reais, e cada registro é uma pilha de discos, um por dia em aberto desde o envio das 18h. Depois de 30 dias, os discos ficam laranja. Um registro em Niterói cresce dia a dia até dois vizinhos confirmarem o conserto.",
  body: [plinth(), tourBairro(), bairroLines(), ...items.map((i) => i.svg)],
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
    const extra = `.rf-late{--anatomy-top:#F47A45;--anatomy-shade-0:#C5470F;--anatomy-shade-1:#D4511A;--anatomy-shade-2:#E05A1F;--anatomy-shade-3:#EC6528;--anatomy-lit-top:#F47A45;--anatomy-lit-shade:#E05A1F}.rf-home{fill:rgb(240 90 26/.10)}.rf-vote{fill:var(--anatomy-shade-1);stroke:var(--anatomy-mid);stroke-width:.6}.rf-vote[data-on]{fill:var(--anatomy-lit)}.iso-line.rf-mark{stroke:#F05A1A}`;
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
