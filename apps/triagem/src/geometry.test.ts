import { describe, expect, test } from "bun:test";
import { iou, letterbox, nms, pad, pixels, shift, tiles, unletterbox, type Box } from "./geometry";

const box = (x1: number, y1: number, x2: number, y2: number, score = 1): Box => ({ x1, y1, x2, y2, score });

describe("geometry", () => {
  test("iou of identical, disjoint and half-overlapping boxes", () => {
    expect(iou(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBe(1);
    expect(iou(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0);
    expect(iou(box(0, 0, 10, 10), box(5, 0, 15, 10))).toBeCloseTo(1 / 3);
  });

  test("nms keeps the best of each overlapping group", () => {
    const kept = nms([box(0, 0, 10, 10, 0.6), box(1, 1, 11, 11, 0.9), box(50, 50, 60, 60, 0.5)]);
    expect(kept.map((b) => b.score)).toEqual([0.9, 0.5]);
  });

  test("a letterboxed box maps back to the original image", () => {
    // 800×600 into 384: scaled by 0.48 to 384×288, 48 px of padding above and below.
    const l = letterbox(800, 600, 384);
    expect(l).toMatchObject({ ratio: 0.48, w: 384, h: 288, padX: 0, padY: 48 });
    const back = unletterbox(box(48, 96, 96, 144), l);
    expect(back).toEqual(box(100, 100, 200, 200));
  });

  test("padding grows a box around its centre and stays inside the image", () => {
    expect(pad(box(100, 100, 200, 200), 1.3, 1000, 1000)).toEqual(box(85, 85, 215, 215));
    expect(pad(box(0, 0, 100, 100), 1.3, 1000, 1000)).toEqual(box(0, 0, 115, 115));
  });

  test("four overlapping tiles cover the image, and boxes found in one move back", () => {
    const t = tiles(1600, 1000);
    expect(t).toEqual([
      { left: 0, top: 0, width: 960, height: 600 },
      { left: 640, top: 0, width: 960, height: 600 },
      { left: 0, top: 400, width: 960, height: 600 },
      { left: 640, top: 400, width: 960, height: 600 },
    ]);
    expect(shift(box(10, 10, 20, 20), 640, 400)).toEqual(box(650, 410, 660, 420));
  });

  test("pixel regions are whole, inside the image and never empty", () => {
    expect(pixels(box(10.4, 20.6, 30.2, 40.1), 100, 100)).toEqual({ left: 10, top: 20, width: 21, height: 21 });
    expect(pixels(box(99.5, 99.5, 120, 120), 100, 100)).toEqual({ left: 99, top: 99, width: 1, height: 1 });
  });
});
