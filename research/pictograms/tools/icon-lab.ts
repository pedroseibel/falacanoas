#!/usr/bin/env bun
/**
 * icon-lab: QA for a family of small solid SVG pictograms on a 24-unit grid.
 *
 *   bun research/pictograms/tools/icon-lab.ts [fileA] [fileB] [--out DIR] [--ref-exclude id,id] [--ink 15] [--size 15]
 *
 * fileA  default: apps/web/src/components/Icons.tsx of the falacanoas repo. A .ts/.tsx file is searched for
 *        a template literal that contains <symbol id=".." viewBox="0 0 24 24">..</symbol>; any other file
 *        (e.g. redraw.svg) is read as a sprite of <symbol> elements.
 * fileB  optional second set (a redraw). Rows with the same symbol id are shown one under the other and the
 *        metrics get a per-icon delta.
 *
 * Writes into DIR (default /tmp/fala-icon-lab):
 *   ladder-light.png, ladder-dark.png   size ladder 12..48 px (true pixels) + 14/16 px x6 nearest zoom,
 *                                       the set in a row at 14/16/24 px and a blurred "squint" row
 *   grid-overlay.png                    every icon on the 24-unit grid with the four keyline shapes and the
 *                                       2..22 live area, plus all icons superimposed
 *   metrics.json                        per-icon ink coverage, bbox, silhouette, solidity, centroid, thin-bar
 *                                       and narrow-gap areas, counters/islands that survive at 24/16/14/13 px,
 *                                       and flags against the set's median (tolerance bands --ink / --size, %)
 *
 * Needs sharp (resolved from the falacanoas checkout) and a system sans font (Noto Sans) for the labels.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, join } from "node:path";

// ---------------------------------------------------------------- sharp
function loadSharp(): any {
  const roots = [new URL("../../../node_modules", import.meta.url).pathname];
  const bunDir = join(roots[0], ".bun");
  if (existsSync(bunDir))
    for (const d of readdirSync(bunDir))
      if (d.startsWith("sharp@")) roots.unshift(join(bunDir, d, "node_modules"));
  for (const r of roots) {
    try {
      return createRequire(join(r, "x.js"))("sharp");
    } catch {}
  }
  return createRequire(import.meta.url)("sharp");
}
const sharp = loadSharp();

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = argv[i + 1] ?? dflt;
  argv.splice(i, 2);
  return v;
};
const OUT = opt("out", "/tmp/fala-icon-lab");
const REF_EXCLUDE = new Set(opt("ref-exclude", "i-clock").split(",").filter(Boolean));
const INK_TOL = Number(opt("ink", "15")) / 100;
const SIZE_TOL = Number(opt("size", "15")) / 100;
const files = argv.length ? argv : [new URL("../../../apps/web/src/components/Icons.tsx", import.meta.url).pathname];
mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- parsing
type Icon = { id: string; inner: string };
type SetOf = { label: string; icons: Icon[] };

function parseSymbols(file: string): Icon[] {
  const src = readFileSync(file, "utf8");
  const out: Icon[] = [];
  const re = /<symbol\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g;
  for (let m; (m = re.exec(src)); ) out.push({ id: m[1]!, inner: m[2]! });
  if (!out.length) {
    const m = /<svg\b[^>]*>([\s\S]*?)<\/svg>/.exec(src);
    if (m) out.push({ id: basename(file).replace(/\.\w+$/, ""), inner: m[1]! });
  }
  if (!out.length) throw new Error(`no <symbol> found in ${file}`);
  return out;
}
const sets: SetOf[] = files.slice(0, 2).map((f, i) => ({
  label: i === 0 ? "A" : "B",
  icons: parseSymbols(f),
}));

// ---------------------------------------------------------------- rendering
const INK_L = "#141414";
const INK_D = "#f2f2ee";
const BG_L = "#f7f7f4";
const BG_D = "#121212";

const paint = (inner: string, ink: string) => inner.replace(/currentColor/g, ink);
const svgOf = (inner: string, ink: string, vb: string, px: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${px}" height="${px}" fill="${ink}" color="${ink}">${paint(inner, ink)}</svg>`;

async function alphaAt(inner: string, px: number, vb = "0 0 24 24"): Promise<Float32Array> {
  const { data, info } = await sharp(Buffer.from(svgOf(inner, "#000", vb, px)), { density: 72 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const a = new Float32Array(info.width * info.height);
  for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3]! / 255;
  return a;
}
const pngAt = (inner: string, ink: string, px: number) =>
  sharp(Buffer.from(svgOf(inner, ink, "0 0 24 24", px)), { density: 72 }).png().toBuffer();

// ---------------------------------------------------------------- image maths
/** Squared Euclidean distance to the nearest `1` pixel in `src` (Felzenszwalb). */
function edt(src: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e12;
  const f = new Float32Array(Math.max(w, h));
  const v = new Int32Array(Math.max(w, h));
  const z = new Float32Array(Math.max(w, h) + 1);
  const d = new Float32Array(w * h);
  const pass = (n: number, get: (i: number) => number, set: (i: number, x: number) => void) => {
    for (let i = 0; i < n; i++) f[i] = get(i);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s: number;
      for (;;) {
        const p = v[k]!;
        s = (f[q]! + q * q - (f[p]! + p * p)) / (2 * q - 2 * p);
        if (s <= z[k]!) k--;
        else break;
        if (k < 0) {
          k = 0;
          break;
        }
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1]! < q) k++;
      const p = v[k]!;
      set(q, (q - p) * (q - p) + f[p]!);
    }
  };
  for (let i = 0; i < w * h; i++) d[i] = src[i] ? 0 : INF;
  for (let x = 0; x < w; x++)
    pass(h, (y) => d[y * w + x]!, (y, val) => (d[y * w + x] = val));
  for (let y = 0; y < h; y++)
    pass(w, (x) => d[y * w + x]!, (x, val) => (d[y * w + x] = val));
  return d;
}

/** Morphological opening of a binary mask with a disk of radius r (pixels). Returns the opened mask. */
function open(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const inv = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inv[i] = mask[i] ? 0 : 1;
  const dBg = edt(inv, w, h); // distance to nearest background
  const eroded = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) eroded[i] = mask[i] && dBg[i]! >= r * r ? 1 : 0;
  const dEr = edt(eroded, w, h);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = dEr[i]! <= r * r ? 1 : 0;
  return out;
}

/** Connected components (4-neighbour) of pixels where pred is true. Returns [labels, count]. */
function components(pred: Uint8Array, w: number, h: number): [Int32Array, number] {
  const lab = new Int32Array(pred.length);
  let n = 0;
  const stack: number[] = [];
  for (let s = 0; s < pred.length; s++) {
    if (!pred[s] || lab[s]) continue;
    n++;
    lab[s] = n;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p / w) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (pred[q] && !lab[q]) {
          lab[q] = n;
          stack.push(q);
        }
      }
    }
  }
  return [lab, n];
}

/** Enclosed counters (background regions not touching the border) and ink islands, at a given pixel size. */
async function countersAndParts(inner: string, px: number) {
  const a = await alphaAt(inner, px);
  const ink = new Uint8Array(a.length);
  const bg = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    ink[i] = a[i]! >= 0.5 ? 1 : 0;
    bg[i] = ink[i] ? 0 : 1;
  }
  const [lab, n] = components(bg, px, px);
  const border = new Set<number>();
  for (let i = 0; i < px; i++)
    for (const p of [i, (px - 1) * px + i, i * px, i * px + px - 1]) if (lab[p]) border.add(lab[p]!);
  const holes = n - border.size;
  const [, parts] = components(ink, px, px);
  return { holes, parts };
}

// ---------------------------------------------------------------- metrics at 24 units
const S = 16; // px per unit
const PAD = 2; // units of padding around the 24 canvas, so overflow is visible
const W = (24 + 2 * PAD) * S;
const VB = `${-PAD} ${-PAD} ${24 + 2 * PAD} ${24 + 2 * PAD}`;

const KEYLINES = {
  circle: 20 * 20 * Math.PI / 4,
  square: 18 * 18,
  portrait: 16 * 20,
  landscape: 20 * 16,
};
const KEY_AREA = 320; // the four keyline shapes all sit within 314-324 units2; use 320 as the nominal size

async function measure(icon: Icon) {
  const a = await alphaAt(icon.inner, W, VB);
  const ink = new Uint8Array(a.length);
  let inkSum = 0;
  let sx = 0;
  let sy = 0;
  let x0 = W, y0 = W, x1 = -1, y1 = -1;
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; x++) {
      const v = a[y * W + x]!;
      if (v >= 0.5) {
        ink[y * W + x] = 1;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      inkSum += v;
      sx += v * (x + 0.5);
      sy += v * (y + 0.5);
    }
  const u = (p: number) => p / S - PAD;
  const unit2 = 1 / (S * S);
  const inkArea = inkSum * unit2;
  // silhouette: everything the border background cannot reach
  const bg = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) bg[i] = ink[i] ? 0 : 1;
  const [lab, n] = components(bg, W, W);
  const border = new Set<number>();
  for (let i = 0; i < W; i++)
    for (const p of [i, (W - 1) * W + i, i * W, i * W + W - 1]) if (lab[p]) border.add(lab[p]!);
  let sil = 0;
  for (let i = 0; i < a.length; i++) if (ink[i] || (bg[i] && !border.has(lab[i]!))) sil++;
  const silArea = sil * unit2;
  // thin bars: ink an opening with a disk of the given width removes, ignoring the ~0.4u sliver that
  // every sharp convex corner loses (so only real bars/necks narrower than `width` are counted)
  const lost = (mask: Uint8Array, width: number, roi: boolean) => {
    const o = open(mask, W, W, (width / 2) * S - 0.5);
    const d = edt(o, W, W); // distance to the opened shape
    const cut = (0.45 * S) ** 2;
    let n = 0;
    for (let y = roi ? y0 : 0; y <= (roi ? y1 : W - 1); y++)
      for (let x = roi ? x0 : 0; x <= (roi ? x1 : W - 1); x++) {
        const i = y * W + x;
        if (mask[i] && !o[i] && d[i]! > cut) n++;
      }
    return n * unit2;
  };
  const thin = (width: number) => lost(ink, width, false);
  // narrow gaps: background (inside the bbox) an opening with that width cannot reach
  const gap = (width: number) => lost(bg, width, true);
  const c24 = await countersAndParts(icon.inner, 24);
  const c16 = await countersAndParts(icon.inner, 16);
  const c14 = await countersAndParts(icon.inner, 14);
  const c13 = await countersAndParts(icon.inner, 13);
  // edge fuzz: share of covered pixels that are neither solid nor clear when drawn at N px
  const fuzz = async (px: number) => {
    const b = await alphaAt(icon.inner, px);
    let g = 0, c = 0;
    for (const v of b) {
      if (v > 0.02) c++;
      if (v > 0.1 && v < 0.9) g++;
    }
    return g / c;
  };
  const r = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
  const bw = u(x1 + 1) - u(x0);
  const bh = u(y1 + 1) - u(y0);
  return {
    id: icon.id,
    inkPct: r((inkArea / 576) * 100, 1),
    inkArea: r(inkArea, 1),
    bbox: { x0: r(u(x0)), y0: r(u(y0)), x1: r(u(x1 + 1)), y1: r(u(y1 + 1)), w: r(bw), h: r(bh) },
    bboxCentre: { x: r(u(x0) + bw / 2), y: r(u(y0) + bh / 2) },
    insideLiveArea: u(x0) >= 1.95 && u(y0) >= 1.95 && u(x1 + 1) <= 22.05 && u(y1 + 1) <= 22.05,
    insideCanvas: u(x0) >= -0.05 && u(y0) >= -0.05 && u(x1 + 1) <= 24.05 && u(y1 + 1) <= 24.05,
    silhouetteArea: r(silArea, 1),
    silhouetteVsKeyline: r(silArea / KEY_AREA, 2),
    solidity: r(inkArea / silArea, 2),
    centroid: { x: r(sx / inkSum / S - PAD), y: r(sy / inkSum / S - PAD) },
    thinInk2: r(thin(2), 2), // area (units2) of ink narrower than 2 units
    thinInk2_5: r(thin(2.5), 2), // ... narrower than 2.5
    narrowGap2: r(gap(2), 2), // area of background gaps narrower than 2 (corner slivers ignored)
    counters: { u24: c24.holes, px16: c16.holes, px14: c14.holes, px13: c13.holes },
    islands: { u24: c24.parts, px16: c16.parts, px14: c14.parts, px13: c13.parts },
    fuzz14: r(await fuzz(14), 2),
    fuzz16: r(await fuzz(16), 2),
    fuzz24: r(await fuzz(24), 2),
  };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

// ---------------------------------------------------------------- run metrics
const result: any = {
  generatedFrom: files,
  note: "units are the 24-unit grid; keyline nominal area 320 units2 (circle 20 = 314, square 18 = 324, 16x20 = 320)",
  tolerance: { inkPct: `+-${INK_TOL * 100}% of median`, silhouetteArea: `+-${SIZE_TOL * 100}% of median` },
  sets: {} as Record<string, any>,
};
for (const s of sets) {
  const rows = [];
  for (const ic of s.icons) rows.push(await measure(ic));
  const ref = rows.filter((r) => !REF_EXCLUDE.has(r.id));
  const mInk = median(ref.map((r) => r.inkPct));
  const mSil = median(ref.map((r) => r.silhouetteArea));
  const mSol = median(ref.map((r) => r.solidity));
  for (const r of rows as any[]) {
    const flags: string[] = [];
    const di = r.inkPct / mInk - 1;
    const ds = r.silhouetteArea / mSil - 1;
    if (di > INK_TOL) flags.push(`HEAVY ink ${(di * 100).toFixed(0)}%`);
    if (di < -INK_TOL) flags.push(`LIGHT ink ${(di * 100).toFixed(0)}%`);
    if (ds > SIZE_TOL) flags.push(`LARGE silhouette +${(ds * 100).toFixed(0)}%`);
    if (ds < -SIZE_TOL) flags.push(`SMALL silhouette ${(ds * 100).toFixed(0)}%`);
    if (!r.insideLiveArea) flags.push("OUTSIDE live area 2..22");
    if (!r.insideCanvas) flags.push("OUTSIDE canvas");
    if (r.thinInk2 > 0.3) flags.push(`THIN ink <2u: ${r.thinInk2}u2`);
    if (r.narrowGap2 > 0.3) flags.push(`NARROW gaps <2u: ${r.narrowGap2}u2`);
    if (r.counters.px14 < r.counters.u24) flags.push(`counters lost at 14px (${r.counters.u24}->${r.counters.px14})`);
    if (r.islands.px14 !== r.islands.u24) flags.push(`islands ${r.islands.u24}->${r.islands.px14} at 14px`);
    if (Math.hypot(r.bboxCentre.x - 12, r.bboxCentre.y - 12) > 1) flags.push("bbox centre off by >1u");
    r.vsMedian = { ink: Math.round(di * 100), silhouette: Math.round(ds * 100) };
    r.flags = flags;
  }
  result.sets[s.label] = {
    file: files[sets.indexOf(s)],
    median: { inkPct: mInk, silhouetteArea: mSil, solidity: mSol },
    range: {
      inkPct: [Math.min(...ref.map((r) => r.inkPct)), Math.max(...ref.map((r) => r.inkPct))],
      spreadInkMaxOverMin: Math.round((Math.max(...ref.map((r) => r.inkPct)) / Math.min(...ref.map((r) => r.inkPct))) * 100) / 100,
    },
    icons: rows,
  };
}
writeFileSync(join(OUT, "metrics.json"), JSON.stringify(result, null, 2));

// console table
for (const s of sets) {
  const set = result.sets[s.label];
  console.log(`\nSet ${s.label}: ${set.file}  median ink ${set.median.inkPct}%  silhouette ${set.median.silhouetteArea}u2  ink max/min ${set.range.spreadInkMaxOverMin}`);
  console.log("id          ink%  Δink  silh  Δsil  solid bbox(w×h)   centroid     thin2 gap2  holes24/14 isl24/14 fuzz14  flags");
  for (const r of set.icons)
    console.log(
      [
        r.id.padEnd(11),
        String(r.inkPct).padStart(5),
        String(r.vsMedian.ink).padStart(4) + "%",
        String(r.silhouetteArea).padStart(5),
        String(r.vsMedian.silhouette).padStart(4) + "%",
        String(r.solidity).padStart(5),
        `${r.bbox.w}×${r.bbox.h}`.padEnd(12),
        `${r.centroid.x},${r.centroid.y}`.padEnd(11),
        String(r.thinInk2).padStart(5),
        String(r.narrowGap2).padStart(5),
        `${r.counters.u24}/${r.counters.px14}`.padStart(6),
        `${r.islands.u24}/${r.islands.px14}`.padStart(7),
        String(r.fuzz14).padStart(6),
        " " + r.flags.join("; "),
      ].join(" "),
    );
}

// ---------------------------------------------------------------- ladder sheets
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const label = (text: string, w: number, h: number, color: string, size = 11) =>
  sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="0" y="${h / 2 + size * 0.35}" font-family="Noto Sans, sans-serif" font-size="${size}" fill="${color}">${esc(text)}</text></svg>`,
    ),
  )
    .png()
    .toBuffer();

async function ladder(dark: boolean) {
  const ink = dark ? INK_D : INK_L;
  const bg = dark ? BG_D : BG_L;
  const mute = dark ? "#8a8a86" : "#777770";
  const sizes = [12, 14, 16, 20, 24, 32, 48];
  const zooms = [14, 16];
  const ZF = 6;
  const LBL = 150;
  const cell = (n: number) => Math.max(n + 22, 44);
  const colW = [...sizes.map(cell), ...zooms.map((z) => z * ZF + 16)];
  const width = LBL + colW.reduce((p, q) => p + q, 0) + 20;
  const rowH = 100;
  const ids = [...new Set(sets.flatMap((s) => s.icons.map((i) => i.id)))];
  const rows: { id: string; set: SetOf; icon: Icon }[] = [];
  for (const id of ids)
    for (const s of sets) {
      const icon = s.icons.find((i) => i.id === id);
      if (icon) rows.push({ id, set: s, icon });
    }
  const head = 34;
  const stripH = 56;
  const height = head + rows.length * rowH + 20 + sets.length * 3 * stripH + 30;
  const comps: any[] = [];
  let x = LBL;
  const heads = [...sizes.map((s) => `${s}px`), ...zooms.map((z) => `${z}px ×${ZF}`)];
  for (let c = 0; c < heads.length; c++) {
    comps.push({ input: await label(heads[c]!, colW[c]!, 20, mute), left: x + 6, top: 8 });
    x += colW[c]!;
  }
  let y = head;
  for (const row of rows) {
    const tag = sets.length > 1 ? `${row.id} ${row.set.label}` : row.id;
    comps.push({ input: await label(tag, LBL, 20, mute), left: 12, top: y + rowH / 2 - 10 });
    let cx = LBL;
    for (let c = 0; c < sizes.length; c++) {
      const n = sizes[c]!;
      comps.push({
        input: await pngAt(row.icon.inner, ink, n),
        left: cx + Math.round((colW[c]! - n) / 2),
        top: y + Math.round((rowH - n) / 2),
      });
      cx += colW[c]!;
    }
    for (let z = 0; z < zooms.length; z++) {
      const n = zooms[z]!;
      const big = await sharp(await pngAt(row.icon.inner, ink, n))
        .resize(n * ZF, n * ZF, { kernel: "nearest" })
        .png()
        .toBuffer();
      comps.push({ input: big, left: cx + 8, top: y + Math.round((rowH - n * ZF) / 2) });
      cx += colW[sizes.length + z]!;
    }
    y += rowH;
  }
  // the set in a row, then the same blurred: the squint test
  y += 20;
  for (const s of sets) {
    const stripIcons = s.icons;
    for (const [px, blur, name] of [[14, 0, "row 14px"], [24, 0, "row 24px"], [24, 1.6, "24px, blur σ1.6"]] as const) {
      comps.push({ input: await label(`${s.label}: ${name}`, LBL, 20, mute), left: 12, top: y + stripH / 2 - 10 });
      const stripW = stripIcons.length * (px + 14) + 10;
      const parts: any[] = [];
      for (let i = 0; i < stripIcons.length; i++)
        parts.push({ input: await pngAt(stripIcons[i]!.inner, ink, px), left: 10 + i * (px + 14), top: Math.round((stripH - px) / 2) });
      let strip = await sharp({ create: { width: stripW, height: stripH, channels: 4, background: bg } })
        .composite(parts)
        .png()
        .toBuffer();
      if (blur) strip = await sharp(strip).blur(blur).png().toBuffer();
      comps.push({ input: strip, left: LBL, top: y });
      y += stripH;
    }
  }
  await sharp({ create: { width, height, channels: 4, background: bg } })
    .composite(comps)
    .png()
    .toFile(join(OUT, dark ? "ladder-dark.png" : "ladder-light.png"));
}
await ladder(false);
await ladder(true);

// ---------------------------------------------------------------- keyline grid overlay
async function overlay() {
  const U = 14; // px per unit
  const cell = 24 * U;
  const gap = 28;
  const cols = 4;
  const ids = [...new Set(sets.flatMap((s) => s.icons.map((i) => i.id)))];
  const rowsN = Math.ceil(ids.length / cols);
  const bigW = cell * 2 + gap; // combined cell spans two columns
  const width = gap + cols * (cell + gap);
  const height = gap + (cell + gap + 20) /* combined */ + rowsN * (cell + gap + 20);
  const colors = ["#141414", "#d6336c"];
  const cellSvg = (cx: number, cy: number, icons: (Icon | undefined)[], opacity: number, title: string) => {
    const g: string[] = [];
    g.push(`<g transform="translate(${cx},${cy})"><rect width="${cell}" height="${cell}" fill="#fff" stroke="#ccc"/>`);
    g.push(`<g transform="scale(${U})">`);
    for (let i = 0; i <= 24; i++)
      g.push(`<path d="M${i} 0V24M0 ${i}H24" stroke="${i % 12 === 0 ? "#bbb" : i % 2 === 0 ? "#e2e2e2" : "#f0f0f0"}" stroke-width="${i % 12 === 0 ? 0.08 : 0.04}"/>`);
    g.push(`<path d="M0 0L24 24M24 0L0 24" stroke="#e6e6e6" stroke-width="0.04"/>`);
    g.push(`<rect x="2" y="2" width="20" height="20" fill="none" stroke="#2a7fff" stroke-width="0.06" stroke-dasharray="0.3 0.3"/>`); // live area
    g.push(`<circle cx="12" cy="12" r="10" fill="none" stroke="#e8590c" stroke-width="0.07"/>`);
    g.push(`<rect x="3" y="3" width="18" height="18" fill="none" stroke="#2f9e44" stroke-width="0.07"/>`);
    g.push(`<rect x="4" y="2" width="16" height="20" fill="none" stroke="#9c36b5" stroke-width="0.07"/>`);
    g.push(`<rect x="2" y="4" width="20" height="16" fill="none" stroke="#1098ad" stroke-width="0.07"/>`);
    icons.forEach((ic, i) => {
      if (ic) g.push(`<g fill="${colors[i % 2]}" color="${colors[i % 2]}" opacity="${opacity}">${paint(ic.inner, colors[i % 2]!)}</g>`);
    });
    g.push(`</g></g>`);
    g.push(`<text x="${cx}" y="${cy + cell + 15}" font-family="Noto Sans, sans-serif" font-size="12" fill="#555">${esc(title)}</text>`);
    return g.join("");
  };
  const body: string[] = [];
  // combined: every icon of set A superimposed (and B in magenta)
  const allBySet = sets.map((s) => s.icons);
  // build the combined cell by hand so it can hold many icons
  {
    const parts: string[] = [];
    const base = cellSvg(gap, gap, [], 1, `all ${ids.length} icons superimposed (opacity .18): dark overlap = ink where many icons agree; orange circle 20, green square 18, violet 16×20, teal 20×16, blue dashed live area 2..22`);
    // insert icons before the closing of the scaled group: cheaper to draw a second layer on top
    parts.push(base);
    sets.forEach((s, si) => {
      parts.push(
        `<g transform="translate(${gap},${gap}) scale(${U})">` +
          s.icons.map((ic) => `<g fill="${colors[si]}" color="${colors[si]}" opacity="0.18">${paint(ic.inner, colors[si]!)}</g>`).join("") +
          `</g>`,
      );
    });
    body.push(parts.join(""));
  }
  // a per-icon note panel beside the combined cell
  const m = result.sets.A;
  const notes = [
    "Keylines (24 grid): circle Ø20, square 18, portrait 16×20, landscape 20×16.",
    "All four are ~320 units² (55% of the canvas): a solid silhouette ≈ that area looks 'full size'.",
    `Set A median: ink ${m.median.inkPct}% of canvas, silhouette ${m.median.silhouetteArea} u², solidity ${m.median.solidity}.`,
    "Per-icon cells below: ink black (A) / magenta (B) at 70%.",
  ];
  notes.forEach((t, i) =>
    body.push(`<text x="${gap + bigW + gap}" y="${gap + 24 + i * 20}" font-family="Noto Sans, sans-serif" font-size="12" fill="#333">${esc(t)}</text>`),
  );
  ids.forEach((id, i) => {
    const cx = gap + (i % cols) * (cell + gap);
    const cy = gap + (cell + gap + 20) + Math.floor(i / cols) * (cell + gap + 20);
    const row = result.sets.A.icons.find((r: any) => r.id === id);
    const title = row ? `${id}  ink ${row.inkPct}% (${row.vsMedian.ink >= 0 ? "+" : ""}${row.vsMedian.ink}%)  silh ${row.silhouetteVsKeyline}× keyline` : id;
    body.push(cellSvg(cx, cy, allBySet.map((icons) => icons.find((i2) => i2.id === id)), 0.72, title));
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#fafafa"/>${body.join("")}</svg>`;
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(join(OUT, "grid-overlay.png"));
}
await overlay();
console.log(`\nwrote ${OUT}/{ladder-light.png,ladder-dark.png,grid-overlay.png,metrics.json}`);
