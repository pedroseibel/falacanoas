import { describe, expect, test } from "bun:test";
import { boxAround, fitBox, metres, metresPerUnit, toTile, within } from "./geo";

const centro: [number, number] = [-51.18205, -29.91611];

describe("geo", () => {
  test("a window of w × h metres is that size", () => {
    const b = boxAround(centro, 400, 260);
    const m = metresPerUnit(centro[1]);
    expect((b.x1 - b.x0) * m).toBeCloseTo(400, 3);
    expect((b.y1 - b.y0) * m).toBeCloseTo(260, 3);
    expect(within(b, toTile(centro))).toEqual([0.5, 0.5]);
  });

  test("fitBox keeps the aspect, the margin and a minimum width", () => {
    const one = fitBox([centro], 1.5, { minWidth: 1200, pad: 0.1 });
    expect((one.x1 - one.x0) * metresPerUnit(centro[1])).toBeCloseTo(1200, 3);
    expect((one.x1 - one.x0) / (one.y1 - one.y0)).toBeCloseTo(1.5, 6);
    const far: [number, number] = [-51.14, -29.88];
    const two = fitBox([centro, far], 1.5, { minWidth: 100, pad: 0.1 });
    for (const p of [centro, far]) {
      const [fx, fy] = within(two, toTile(p));
      expect(fx > 0.05 && fx < 0.95 && fy > 0.05 && fy < 0.95).toBeTrue();
    }
  });

  test("metres between points in the city", () => {
    expect(metres(centro, [centro[0] + 0.001, centro[1]])).toBeCloseTo(96.5, 0);
  });
});
