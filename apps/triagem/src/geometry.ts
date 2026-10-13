/**
 * Boxes in image pixels, and the arithmetic every detector shares: undoing the model's resize, merging
 * overlapping detections, and padding a box before it is blurred. Pure, so it is tested without models.
 */

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
}

const area = (b: Box) => Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);

export function iou(a: Box, b: Box): number {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / (area(a) + area(b) - inter);
}

/** Non-maximum suppression: the best box of each overlapping group survives. */
export function nms<T extends Box>(boxes: T[], threshold = 0.45): T[] {
  const kept: T[] = [];
  for (const b of boxes.toSorted((p, q) => q.score - p.score))
    if (kept.every((k) => iou(k, b) < threshold)) kept.push(b);
  return kept;
}

/**
 * A YOLO-style letterbox: the image scaled to fit a `size`×`size` square, centred, the rest padded.
 * Returns what's needed to map boxes back to the original image.
 */
export function letterbox(width: number, height: number, size: number) {
  const ratio = Math.min(size / width, size / height);
  const w = Math.round(width * ratio);
  const h = Math.round(height * ratio);
  return { ratio, w, h, padX: (size - w) / 2, padY: (size - h) / 2 };
}

/** A box from letterboxed model space back to the original image. */
export const unletterbox = (b: Box, l: { ratio: number; padX: number; padY: number }): Box => ({
  x1: (b.x1 - l.padX) / l.ratio,
  y1: (b.y1 - l.padY) / l.ratio,
  x2: (b.x2 - l.padX) / l.ratio,
  y2: (b.y2 - l.padY) / l.ratio,
  score: b.score,
});

/**
 * A box grown by `scale` around its centre and kept inside the image: a blur that just covers a face
 * or a plate leaves its edges readable, so blurs are padded (about 30%, as the deface tool does).
 */
export function pad(b: Box, scale: number, width: number, height: number): Box {
  const cx = (b.x1 + b.x2) / 2;
  const cy = (b.y1 + b.y2) / 2;
  const hw = ((b.x2 - b.x1) * scale) / 2;
  const hh = ((b.y2 - b.y1) * scale) / 2;
  return {
    x1: Math.max(0, cx - hw),
    y1: Math.max(0, cy - hh),
    x2: Math.min(width, cx + hw),
    y2: Math.min(height, cy + hh),
    score: b.score,
  };
}

/** Whole pixels, inside the image, at least one pixel wide: what an image library can extract. */
export function pixels(b: Box, width: number, height: number) {
  const left = Math.max(0, Math.floor(b.x1));
  const top = Math.max(0, Math.floor(b.y1));
  const right = Math.min(width, Math.ceil(b.x2));
  const bottom = Math.min(height, Math.ceil(b.y2));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

/**
 * Overlapping tiles for a large image: detectors trained on whole scenes miss a face or a plate that
 * is a few dozen pixels in a phone photo, so they also look at each quarter, enlarged. Each tile
 * overlaps its neighbours by `overlap` so nothing on a seam is cut in half.
 */
export function tiles(width: number, height: number, overlap = 0.2) {
  const w = Math.round((width / 2) * (1 + overlap));
  const h = Math.round((height / 2) * (1 + overlap));
  return [
    { left: 0, top: 0, width: w, height: h },
    { left: width - w, top: 0, width: w, height: h },
    { left: 0, top: height - h, width: w, height: h },
    { left: width - w, top: height - h, width: w, height: h },
  ];
}

/** A box found in a tile, moved back to the whole image. */
export const shift = <T extends Box>(b: T, left: number, top: number): T => ({
  ...b,
  x1: b.x1 + left,
  y1: b.y1 + top,
  x2: b.x2 + left,
  y2: b.y2 + top,
});
