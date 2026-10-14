import sharp from "sharp";

/**
 * PDQ, Meta's perceptual image hash, ported from the reference Python implementation in
 * https://github.com/facebook/ThreatExchange/tree/main/pdq (BSD licence, Copyright (c) Meta
 * Platforms, Inc. and affiliates). A photo becomes 256 bits that survive resizing, recompression and
 * small edits, so it can be compared with known abuse material without the photo leaving here
 * (BUILD 5.8; research/legal/hash-matching.md). The steps follow the reference: fit within 512 px,
 * luminance, two passes of Jarosz box filtering, decimation to 64×64, a 16×16 DCT, then one bit per
 * coefficient above the median. Pure apart from decoding.
 */

const LUMA_R = 0.299;
const LUMA_G = 0.587;
const LUMA_B = 0.114;
const JAROSZ_PASSES = 2;
const JAROSZ_WINDOW_DIVISOR = 128;
/** Below this, Meta advises not to trust the hash for matching: the image has too little texture. */
export const PDQ_MIN_QUALITY = 50;

/** Rows 1–16 of the 64-point DCT-II basis (the reference skips the DC row). */
const DCT: Float64Array[] = Array.from({ length: 16 }, (_row, i) =>
  Float64Array.from(
    { length: 64 },
    (_col, j) => Math.sqrt(2 / 64) * Math.cos((Math.PI / 2 / 64) * (i + 1) * (2 * j + 1)),
  ),
);

export interface PdqHash {
  /** 64 hex digits, in the reference's order (most significant word first). */
  hex: string;
  /** 0–100. */
  quality: number;
}

const windowSize = (dimension: number) => Math.floor((dimension + JAROSZ_WINDOW_DIVISOR - 1) / JAROSZ_WINDOW_DIVISOR);

/** One box-filter pass along a vector (the reference's box1DFloat), from `input` into `output`. */
function box1D(
  input: Float64Array,
  inStart: number,
  output: Float64Array,
  outStart: number,
  length: number,
  stride: number,
  window: number,
) {
  const half = Math.floor((window + 2) / 2);
  const phase1 = half - 1;
  const phase2 = window - half + 1;
  const phase3 = length - window;
  const phase4 = half - 1;
  let li = 0;
  let ri = 0;
  let oi = 0;
  let sum = 0;
  let size = 0;
  for (let i = 0; i < phase1; i++) {
    sum += input[inStart + ri] ?? 0;
    size++;
    ri += stride;
  }
  for (let i = 0; i < phase2; i++) {
    sum += input[inStart + ri] ?? 0;
    size++;
    output[outStart + oi] = sum / size;
    ri += stride;
    oi += stride;
  }
  for (let i = 0; i < phase3; i++) {
    sum += input[inStart + ri] ?? 0;
    sum -= input[inStart + li] ?? 0;
    output[outStart + oi] = sum / size;
    li += stride;
    ri += stride;
    oi += stride;
  }
  for (let i = 0; i < phase4; i++) {
    sum -= input[inStart + li] ?? 0;
    size--;
    output[outStart + oi] = sum / size;
    li += stride;
    oi += stride;
  }
}

/** Two passes of rows-then-columns box filtering: a cheap tent-like blur before decimating. */
function jarosz(a: Float64Array, b: Float64Array, rows: number, cols: number) {
  const alongRows = windowSize(cols);
  const alongCols = windowSize(rows);
  for (let pass = 0; pass < JAROSZ_PASSES; pass++) {
    for (let i = 0; i < rows; i++) box1D(a, i * cols, b, i * cols, cols, 1, alongRows);
    for (let j = 0; j < cols; j++) box1D(b, j, a, j, rows, cols, alongCols);
  }
}

function decimate(values: Float64Array, rows: number, cols: number): Float64Array[] {
  return Array.from({ length: 64 }, (_row, i) => {
    const ini = Math.floor(((i + 0.5) * rows) / 64);
    return Float64Array.from(
      { length: 64 },
      (_col, j) => values[ini * cols + Math.floor(((j + 0.5) * cols) / 64)] ?? 0,
    );
  });
}

/** The reference's heuristic: how many significant gradients the 64×64 image has, capped at 100. */
function quality(m: Float64Array[]): number {
  let gradients = 0;
  for (let i = 0; i < 63; i++)
    for (let j = 0; j < 64; j++)
      gradients += Math.abs(Math.trunc((((m[i]?.[j] ?? 0) - (m[i + 1]?.[j] ?? 0)) * 100) / 255));
  for (let i = 0; i < 64; i++)
    for (let j = 0; j < 63; j++)
      gradients += Math.abs(Math.trunc((((m[i]?.[j] ?? 0) - (m[i]?.[j + 1] ?? 0)) * 100) / 255));
  return Math.min(100, Math.trunc(gradients / 90));
}

/** D · A · Dᵀ: the 16×16 low-frequency block of the 64×64 DCT. */
function dct16(a: Float64Array[]): Float64Array[] {
  const t = DCT.map((d) =>
    Float64Array.from({ length: 64 }, (_, j) => {
      let s = 0;
      for (let k = 0; k < 64; k++) s += (d[k] ?? 0) * (a[k]?.[j] ?? 0);
      return s;
    }),
  );
  return t.map((ti) =>
    Float64Array.from({ length: 16 }, (_, j) => {
      let s = 0;
      const dj = DCT[j];
      for (let k = 0; k < 64; k++) s += (ti[k] ?? 0) * (dj?.[k] ?? 0);
      return s;
    }),
  );
}

/** Torben's median, as the reference computes it (the exact value matters for which bits are set). */
function torben(m: Float64Array[]): number {
  const values = m.flatMap((row) => [...row]);
  const midn = Math.floor((values.length + 1) / 2);
  let min = Math.min(...values);
  let max = Math.max(...values);
  for (;;) {
    const guess = (min + max) / 2;
    let less = 0;
    let greater = 0;
    let equal = 0;
    let maxlt = min;
    let mingt = max;
    for (const v of values) {
      if (v < guess) {
        less++;
        if (v > maxlt) maxlt = v;
      } else if (v > guess) {
        greater++;
        if (v < mingt) mingt = v;
      } else equal++;
    }
    if (less <= midn && greater <= midn) {
      if (less >= midn) return maxlt;
      if (less + equal >= midn) return guess;
      return mingt;
    }
    if (less > greater) max = maxlt;
    else min = mingt;
  }
}

/** One bit per coefficient above the median; words printed most significant first, like the reference. */
function bits(m: Float64Array[]): string {
  const median = torben(m);
  const words = new Uint16Array(16);
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++) {
      const k = i * 16 + j;
      if ((m[i]?.[j] ?? 0) > median) words[k >> 4] = (words[k >> 4] ?? 0) | (1 << (k & 15));
    }
  return [...words]
    .toReversed()
    .map((w) => w.toString(16).padStart(4, "0"))
    .join("");
}

/**
 * The seven other orientations of the same image, from its DCT alone (the reference's dct16Original
 * To*): a flipped or rotated copy of known material still matches.
 */
const DIHEDRAL: ((a: Float64Array[]) => Float64Array[])[] = [
  (a) => a.map((row, i) => row.map((v, j) => (((i + j) & 1) !== 0 ? -v : v))), // rotate 180
  (a) => a.map((row, i) => row.map((v) => ((i & 1) !== 0 ? v : -v))), // flip x
  (a) => a.map((row) => row.map((v, j) => ((j & 1) !== 0 ? v : -v))), // flip y
  (a) => transpose(a, () => 1), // flip about the main diagonal
  (a) => transpose(a, (i, j) => (((i + j) & 1) !== 0 ? -1 : 1)), // flip about the other diagonal
  (a) => transpose(a, (_i, j) => ((j & 1) !== 0 ? 1 : -1)), // rotate 90
  (a) => transpose(a, (i) => ((i & 1) !== 0 ? 1 : -1)), // rotate 270
];

/** B[j][i] = sign(i, j) · A[i][j]. */
function transpose(a: Float64Array[], sign: (i: number, j: number) => number): Float64Array[] {
  return Array.from({ length: 16 }, (_row, j) =>
    Float64Array.from({ length: 16 }, (_col, i) => sign(i, j) * (a[i]?.[j] ?? 0)),
  );
}

async function luma(bytes: Uint8Array, fit512: boolean) {
  let image = sharp(bytes, { autoOrient: false });
  if (fit512) image = image.resize(512, 512, { fit: "inside", withoutEnlargement: true, kernel: "cubic" });
  const { data, info } = await image.removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const out = new Float64Array(info.height * info.width);
  for (let p = 0; p < out.length; p++)
    out[p] =
      LUMA_R * (data[p * info.channels] ?? 0) +
      LUMA_G * (data[p * info.channels + 1] ?? 0) +
      LUMA_B * (data[p * info.channels + 2] ?? 0);
  return { values: out, rows: info.height, cols: info.width };
}

async function block(bytes: Uint8Array, fit512: boolean) {
  const { values, rows, cols } = await luma(bytes, fit512);
  jarosz(values, new Float64Array(values.length), rows, cols);
  const small = decimate(values, rows, cols);
  return { dct: dct16(small), quality: quality(small) };
}

/**
 * What a photo is checked with, as the reference computes it:
 * - `hash`: the canonical PDQ, after fitting within 512×512 (Meta's photo hasher; how lists are built);
 * - `orientations`: the eight orientations (the original first), derived at full resolution from one
 *   DCT, like the reference's dihedral hasher, so a flipped or rotated copy of known material matches.
 * No EXIF rotation, like the reference (our uploads carry none anyway).
 */
export async function pdq(bytes: Uint8Array): Promise<{ hash: PdqHash; orientations: string[] }> {
  const [canonical, full] = await Promise.all([block(bytes, true), block(bytes, false)]);
  return {
    hash: { hex: bits(canonical.dct), quality: canonical.quality },
    orientations: [bits(full.dct), ...DIHEDRAL.map((turn) => bits(turn(full.dct)))],
  };
}

/** Set bits in each byte value. */
const POPCOUNT = Uint8Array.from({ length: 256 }, (_, v) => {
  let n = 0;
  for (let b = 0; b < 8; b++) n += (v >> b) & 1;
  return n;
});

/** Bits that differ between two hashes (0–256): a near match is a small distance. */
export function hamming(a: string, b: string): number {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  let n = 0;
  for (let i = 0; i < 32; i++) n += POPCOUNT[(x[i] ?? 0) ^ (y[i] ?? 0)] ?? 0;
  return n;
}

/** The 32 bytes as base64, the form Arachnid Shield's /v1/pdq takes (bytes in the hex string's order). */
export const toBase64 = (hex: string) => Buffer.from(hex, "hex").toString("base64");
